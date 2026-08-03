"use server";

import { compare, hash } from "bcryptjs";
import { and, eq, isNull, ne, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/drizzle/db";
import { UserTable } from "@/drizzle/schema";
import {
    updateEmailSchema,
    updatePasswordSchema,
    updateProfileSchema,
} from "@/data/schemas/profile";
import { updateUserProfile } from "../db/users";
import { getCurrentUser } from "./currentUser";
import { revalidateUserCache } from "../db/cache/users";

// What every form on /profile gets back: a general `error`, per-field messages,
// or a `success` line to show once the write went through. Same shape as the
// sign-up action so the forms read the same way.
export type ProfileState = {
    error?: string;
    success?: string;
    fieldErrors?: Record<string, string[] | undefined>;
};

// Server Actions answer plain POSTs, not just our own forms, so each one below
// re-reads the session rather than trusting anything the client sent. None of
// them takes a user id: the only account any of these can touch is the one the
// cookie proves you are.
async function requireUser() {
    const { userId } = await getCurrentUser();
    if (userId == null) return null;
    return userId;
}

// The hash for a user, or `undefined` if they have none (a Google account that
// never set one). Read on its own so the two password-gated actions below can
// refuse those accounts before doing anything else.
async function getPasswordHash(userId: string) {
    const user = await db.query.UserTable.findFirst({
        columns: { password: true },
        where: and(eq(UserTable.id, userId), isNull(UserTable.deletedAt)),
    });
    return user?.password ?? undefined;
}

// The navbar draws the avatar and nothing else on the page shows it, so the
// layout has to be rebuilt for a new picture to appear anywhere but here.
// `"layout"` at the root does that for every route at once.
function revalidateProfile(userId: string) {
    revalidateUserCache(userId);
    revalidatePath("/", "layout");
}

// Picture and display name — the only two edits a Google account is allowed,
// and the only ones that need no password, since neither can be used to take
// the account over.
export async function updateProfile(
    _prevState: ProfileState | undefined,
    formData: FormData
): Promise<ProfileState> {
    const userId = await requireUser();
    if (userId == null) return { error: "Debes iniciar sesión." };

    const parsed = updateProfileSchema.safeParse({
        name: formData.get("name"),
        image: formData.get("image"),
    });

    if (!parsed.success) {
        return { fieldErrors: z.flattenError(parsed.error).fieldErrors };
    }

    // The db layer, not a plain UPDATE here: replacing a photo also means
    // deleting the one it replaced from UploadThing, and that read-then-write
    // belongs next to the write it depends on.
    await updateUserProfile(userId, {
        name: parsed.data.name,
        image: parsed.data.image,
    });

    revalidateProfile(userId);

    return { success: "Perfil actualizado." };
}

// Changing the address the account signs in with. Gated on the current
// password: a borrowed open session would otherwise be enough to move the
// account to an attacker's email and lock the owner out.
//
// Nothing is sent to either address to confirm the change — the app has no
// mail provider — so this takes effect immediately and a typo means signing in
// with the wrong address from now on. That is the accepted trade for not
// standing up email delivery.
export async function updateEmail(
    _prevState: ProfileState | undefined,
    formData: FormData
): Promise<ProfileState> {
    const userId = await requireUser();
    if (userId == null) return { error: "Debes iniciar sesión." };

    const parsed = updateEmailSchema.safeParse({
        email: formData.get("email"),
        confirmEmail: formData.get("confirmEmail"),
        currentPassword: formData.get("currentPassword"),
    });

    if (!parsed.success) {
        return { fieldErrors: z.flattenError(parsed.error).fieldErrors };
    }

    // Checked here and not only hidden in the UI: the form being absent from
    // the page stops nobody from posting to this action directly.
    const passwordHash = await getPasswordHash(userId);
    if (passwordHash == null) {
        return { error: "Tu cuenta inicia sesión con Google." };
    }

    const passwordMatches = await compare(
        parsed.data.currentPassword,
        passwordHash
    );
    if (!passwordMatches) {
        return { fieldErrors: { currentPassword: ["Contraseña incorrecta."] } };
    }

    // Case-insensitive, matching the unique index on `lower(email)` — without
    // this the database would reject the write with an opaque error instead.
    const taken = await db.query.UserTable.findFirst({
        columns: { id: true },
        where: and(
            sql`lower(${UserTable.email}) = ${parsed.data.email}`,
            ne(UserTable.id, userId)
        ),
    });
    if (taken != null) {
        return { fieldErrors: { email: ["Ya hay una cuenta con este email."] } };
    }

    await db
        .update(UserTable)
        // Cleared because the new address has proven nothing. Nothing reads
        // this column today, but leaving a verification stamp behind on an
        // address that was never checked would be a lie to whatever does.
        .set({ email: parsed.data.email, emailVerified: null })
        .where(eq(UserTable.id, userId));

    revalidateProfile(userId);

    return { success: "Email actualizado." };
}

export async function updatePassword(
    _prevState: ProfileState | undefined,
    formData: FormData
): Promise<ProfileState> {
    const userId = await requireUser();
    if (userId == null) return { error: "Debes iniciar sesión." };

    const parsed = updatePasswordSchema.safeParse({
        currentPassword: formData.get("currentPassword"),
        newPassword: formData.get("newPassword"),
        confirmPassword: formData.get("confirmPassword"),
    });

    if (!parsed.success) {
        return { fieldErrors: z.flattenError(parsed.error).fieldErrors };
    }

    const passwordHash = await getPasswordHash(userId);
    if (passwordHash == null) {
        return { error: "Tu cuenta inicia sesión con Google." };
    }

    const passwordMatches = await compare(
        parsed.data.currentPassword,
        passwordHash
    );
    if (!passwordMatches) {
        return { fieldErrors: { currentPassword: ["Contraseña incorrecta."] } };
    }

    // 12 rounds, the same cost sign-up uses. A mismatch here would leave the
    // two hashes distinguishable by how long they take to check.
    const newHash = await hash(parsed.data.newPassword, 12);

    await db
        .update(UserTable)
        .set({ password: newHash })
        .where(eq(UserTable.id, userId));

    revalidateProfile(userId);

    // The session is a JWT holding only the user id and role, so it survives
    // this untouched — the person stays signed in here, and every other device
    // stays signed in too until its token expires. Revoking those would mean
    // database sessions, which this app does not use.
    return { success: "Contraseña actualizada." };
}
