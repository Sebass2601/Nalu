import "server-only";

import { and, eq, gt, isNull, like, sql } from "drizzle-orm";
import { hash } from "bcryptjs";
import { db } from "@/drizzle/db";
import { UserTable, VerificationTokenTable } from "@/drizzle/schema";
import {
    RESET_RESEND_COOLDOWN_MS,
    RESET_TOKEN_TTL_MS,
    emailFromResetIdentifier,
    generateResetToken,
    hashResetToken,
    resetIdentifier,
} from "../lib/passwordReset";
import { revalidateUserCache } from "./cache/users";

// Pattern matching every reset row and nothing Auth.js writes to the same
// table. `resetIdentifier("")` is just the prefix.
const RESET_ROWS = `${resetIdentifier("")}%`;

// Issues a fresh one-time key for this address, or null when none should be
// sent: no such account, a deleted one, or a link already sent moments ago.
//
// The caller tells the visitor the same thing in every one of those cases, so
// a null here is never shown to anybody — see the action that calls this.
//
// `email` must already be normalized (trimmed, lowercased), as `emailSchema`
// leaves it.
export async function issuePasswordReset(email: string) {
    const user = await db.query.UserTable.findFirst({
        columns: { name: true, email: true },
        where: and(
            sql`lower(${UserTable.email}) = ${email}`,
            isNull(UserTable.deletedAt)
        ),
    });
    if (user == null) return null;

    const identifier = resetIdentifier(email);
    const now = Date.now();

    // A key issued within the cooldown still has more than (TTL - cooldown)
    // left to live. Reading it off `expires` avoids a creation-time column the
    // shared Auth.js table does not have.
    const recent = await db.query.VerificationTokenTable.findFirst({
        columns: { identifier: true },
        where: and(
            eq(VerificationTokenTable.identifier, identifier),
            gt(
                VerificationTokenTable.expires,
                new Date(now + RESET_TOKEN_TTL_MS - RESET_RESEND_COOLDOWN_MS)
            )
        ),
    });
    if (recent != null) return null;

    const token = generateResetToken();

    // Only the newest link works. Asking twice and then using the first email
    // would otherwise leave the second key valid in an inbox for the next hour.
    await db.transaction(async tx => {
        await tx
            .delete(VerificationTokenTable)
            .where(eq(VerificationTokenTable.identifier, identifier));
        await tx.insert(VerificationTokenTable).values({
            identifier,
            token: hashResetToken(token),
            expires: new Date(now + RESET_TOKEN_TTL_MS),
        });
    });

    return { token, name: user.name, email: user.email };
}

// Withdraws a key that was issued but whose email never left. Without this, a
// failed send would still trip the cooldown, and the person would be told to
// wait for an email that is not coming.
export async function withdrawPasswordReset(token: string) {
    await db
        .delete(VerificationTokenTable)
        .where(eq(VerificationTokenTable.token, hashResetToken(token)));
}

// Whether a key can still be used. For drawing the page only — the decision
// that matters is made again, atomically, in `redeemPasswordReset`.
export async function isPasswordResetValid(token: string) {
    const row = await db.query.VerificationTokenTable.findFirst({
        columns: { identifier: true },
        where: and(
            eq(VerificationTokenTable.token, hashResetToken(token)),
            like(VerificationTokenTable.identifier, RESET_ROWS),
            gt(VerificationTokenTable.expires, new Date())
        ),
    });
    return row != null;
}

// Spends a key and sets the new password. Returns the account's email, or null
// if the key was unknown, expired or already used.
//
// Spending is a single DELETE ... RETURNING: of two requests racing with the
// same key, exactly one gets the row back. A read-then-delete would let both
// see it first and both succeed. It runs inside the same transaction as the
// password write, so a failure there puts the key back rather than eating it.
export async function redeemPasswordReset(token: string, newPassword: string) {
    // Hashed before the transaction opens: bcrypt at cost 12 takes a few
    // hundred milliseconds, and there is no reason to hold a database
    // connection while it runs. Same cost as sign-up and the profile form.
    const passwordHash = await hash(newPassword, 12);

    const user = await db.transaction(async tx => {
        const [spent] = await tx
            .delete(VerificationTokenTable)
            .where(
                and(
                    eq(VerificationTokenTable.token, hashResetToken(token)),
                    like(VerificationTokenTable.identifier, RESET_ROWS),
                    gt(VerificationTokenTable.expires, new Date())
                )
            )
            .returning({ identifier: VerificationTokenTable.identifier });
        if (spent == null) return null;

        const email = emailFromResetIdentifier(spent.identifier);
        if (email == null) return null;

        const [user] = await tx
            .update(UserTable)
            .set({
                password: passwordHash,
                // Opening the link proves the inbox is theirs — exactly what
                // `emailVerified` records. Kept if it was already set, so the
                // original date survives.
                emailVerified: sql`coalesce(${UserTable.emailVerified}, now())`,
            })
            .where(
                and(
                    sql`lower(${UserTable.email}) = ${email}`,
                    isNull(UserTable.deletedAt)
                )
            )
            .returning({ id: UserTable.id, email: UserTable.email });

        // Undefined when the account was deleted, or its address changed,
        // after the link was sent. The key is spent either way; there is
        // nothing to reset.
        return user ?? null;
    });
    if (user == null) return null;

    // After the commit, not inside it: the cache must never be told about a
    // change that might still roll back. /profile reads whether a password is
    // set, and an account that signed up through Google has just gained one.
    revalidateUserCache(user.id);
    return user.email;
}
