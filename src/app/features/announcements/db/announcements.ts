import { asc, desc, eq } from "drizzle-orm";
import { cacheTag } from "next/cache";
import { db } from "@/drizzle/db";
import { AnnouncementImageTable, AnnouncementTable } from "@/drizzle/schema";
import { deleteUploadThingFiles } from "@/lib/uploadthingServer";
import {
    getAnnouncementGlobalTag,
    getAnnouncementIdTag,
    revalidateAnnouncementCache,
} from "./cache/announcements";

// The writes, plus the two reads that only the admin panel makes. Kept apart from
// `announcementFeed`, which is the public side: the queries here return drafts as
// well as published notices, and mixing the two in one file is how a draft ends
// up on a page that meant to show only published ones.

// Every announcement, published or not, newest first — the admin list.
export async function getAnnouncements() {
    "use cache";
    cacheTag(getAnnouncementGlobalTag());

    return db.query.AnnouncementTable.findMany({
        columns: {
            id: true,
            name: true,
            status: true,
            createdAt: true,
        },
        orderBy: desc(AnnouncementTable.createdAt),
    });
}

// One announcement for the edit form, whatever its status, with its images so the
// picture list can be edited alongside the words.
export async function getAnnouncement(id: string) {
    "use cache";
    cacheTag(getAnnouncementIdTag(id));

    return db.query.AnnouncementTable.findFirst({
        columns: {
            id: true,
            name: true,
            content: true,
            status: true,
        },
        where: eq(AnnouncementTable.id, id),
        with: {
            images: {
                columns: { id: true, url: true, caption: true },
                orderBy: asc(AnnouncementImageTable.order),
            },
        },
    });
}

export async function insertAnnouncement(
    data: typeof AnnouncementTable.$inferInsert
) {
    const [newAnnouncement] = await db
        .insert(AnnouncementTable)
        .values(data)
        .returning();

    if (newAnnouncement == null) throw new Error("No se pudo crear el anuncio.");

    revalidateAnnouncementCache(newAnnouncement.id);

    return newAnnouncement;
}

export async function updateAnnouncement(
    id: string,
    data: Partial<typeof AnnouncementTable.$inferInsert>
) {
    const [updatedAnnouncement] = await db
        .update(AnnouncementTable)
        .set(data)
        .where(eq(AnnouncementTable.id, id))
        .returning();

    if (updatedAnnouncement == null) {
        throw new Error("No se pudo actualizar el anuncio.");
    }

    revalidateAnnouncementCache(updatedAnnouncement.id);

    return updatedAnnouncement;
}

// Deleting an announcement also deletes the files its pictures pointed at.
//
// The rows go on their own — `announcement_images` cascades — but a foreign key
// knows nothing about UploadThing, so the stored files would stay behind forever,
// paid for and unreachable. Their URLs are read BEFORE the delete, because after
// it there is nothing left to read them from.
export async function deleteAnnouncement(id: string) {
    const images = await db.query.AnnouncementImageTable.findMany({
        columns: { url: true },
        where: eq(AnnouncementImageTable.announcementId, id),
    });

    const [deletedAnnouncement] = await db
        .delete(AnnouncementTable)
        .where(eq(AnnouncementTable.id, id))
        .returning();

    if (deletedAnnouncement == null) {
        throw new Error("No se pudo eliminar el anuncio.");
    }

    if (images.length > 0) {
        await deleteUploadThingFiles(images.map(image => image.url));
    }

    revalidateAnnouncementCache(deletedAnnouncement.id);

    return deletedAnnouncement;
}
