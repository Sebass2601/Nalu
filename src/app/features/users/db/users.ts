import { db } from "@/drizzle/db";
import { UserTable } from "@/drizzle/schema";
import { eq, isNull, and } from "drizzle-orm";
import { stripe } from "@/lib/stripe";
import { deleteUploadThingFiles } from "@/lib/uploadthingServer";
import { revalidateUserCache } from "./cache/users";

// What /profile needs to draw itself.
//
// Separate from `getCurrentUser` because of one field: whether a password is
// set. `getCurrentUser` runs on nearly every request and deliberately never
// selects the hash, so rather than widen it for one screen, this reads the
// column here and hands back only the boolean — the hash never leaves this
// function.
//
// That boolean is what splits the page in two. An account created through
// Google has no password, so it gets neither the email form (which is gated on
// typing the current password) nor the password form — only the picture and
// the name are its own to change.
export async function getProfileUser(userId: string) {
    const user = await db.query.UserTable.findFirst({
        columns: {
            id: true,
            name: true,
            email: true,
            image: true,
            password: true,
        },
        where: and(eq(UserTable.id, userId), isNull(UserTable.deletedAt)),
    });

    if (user == null) return null;

    const { password, ...rest } = user;
    return { ...rest, hasPassword: password != null };
}

// Writes a user's own photo and name, and cleans up the photo it replaced.
//
// Same shape as `updateCourse` and `updateProduct`, for the same reason: the
// old URL has to be read before the row is overwritten, or the file it points
// at is stranded in UploadThing storage forever. Avatars make that worse than
// a course cover does — one person can change their picture any number of
// times, and every abandoned one would be billable storage nobody can reach.
//
// Passing a Google avatar URL through here is safe: `deleteUploadThingFiles`
// resolves a key only for `ufs.sh` hosts and ignores anything else, so a
// Google user who uploads their first photo does not send a delete for a file
// on Google's servers.
export async function updateUserProfile(
    userId: string,
    data: { name: string; image: string | null }
) {
    const current = await db.query.UserTable.findFirst({
        columns: { image: true },
        where: and(eq(UserTable.id, userId), isNull(UserTable.deletedAt)),
    });

    const [updated] = await db
        .update(UserTable)
        .set(data)
        .where(and(eq(UserTable.id, userId), isNull(UserTable.deletedAt)))
        .returning({ id: UserTable.id, image: UserTable.image });

    if (updated == null) throw new Error("Usuario no encontrado.");

    // Covers both replacing the photo and clearing it outright. Runs after the
    // row is safely written, so a storage failure can never cost us the update.
    const previousImage = current?.image;
    if (previousImage != null && previousImage !== updated.image) {
        await deleteUploadThingFiles(previousImage);
    }

    revalidateUserCache(userId);

    return updated;
}

// Returns the Stripe Customer ID for a user, creating the Customer the first
// time they reach checkout.
//
// A one-time purchase works fine without a Customer — `customer_email` is
// enough to send a receipt. A subscription does not: Stripe hangs the
// subscription, its invoices, the saved payment method and the billing portal
// off a Customer, so without a stable ID a returning subscriber looks like a
// stranger and can never manage or cancel their plan.
//
// Created lazily rather than at sign-up because most users never buy anything,
// and every Customer object created for them would be permanent clutter in the
// Stripe dashboard.
export async function getOrCreateStripeCustomer(user: {
    id: string;
    email: string;
    name: string;
}) {
    const existing = await db.query.UserTable.findFirst({
        columns: { stripeCustomerId: true },
        where: and(eq(UserTable.id, user.id), isNull(UserTable.deletedAt)),
    });

    if (existing == null) throw new Error("Usuario no encontrado.");
    if (existing.stripeCustomerId != null) return existing.stripeCustomerId;

    const customer = await stripe.customers.create({
        email: user.email,
        name: user.name,
        // Lets us walk back from a Stripe Customer to our own user when
        // debugging a webhook or a support question, without a lookup table.
        metadata: { userId: user.id },
    });

    // Guarded on `stripeCustomerId IS NULL` so two checkouts started at the
    // same moment cannot overwrite each other. The loser of that race leaves
    // its Customer unused in Stripe, which is harmless — whereas overwriting
    // would orphan the subscription attached to the first one.
    const [updated] = await db
        .update(UserTable)
        .set({ stripeCustomerId: customer.id })
        .where(
            and(
                eq(UserTable.id, user.id),
                isNull(UserTable.stripeCustomerId)
            )
        )
        .returning({ stripeCustomerId: UserTable.stripeCustomerId });

    revalidateUserCache(user.id);

    // Undefined when the guard above matched nothing, i.e. another request won
    // the race. Re-read so we return the ID that actually got stored.
    if (updated?.stripeCustomerId != null) return updated.stripeCustomerId;

    const current = await db.query.UserTable.findFirst({
        columns: { stripeCustomerId: true },
        where: eq(UserTable.id, user.id),
    });

    if (current?.stripeCustomerId == null) {
        throw new Error("No se pudo asociar el cliente de Stripe.");
    }

    return current.stripeCustomerId;
}
