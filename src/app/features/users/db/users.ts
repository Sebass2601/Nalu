import { db } from "@/drizzle/db";
import { UserTable } from "@/drizzle/schema";
import { eq, isNull, and } from "drizzle-orm";
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

