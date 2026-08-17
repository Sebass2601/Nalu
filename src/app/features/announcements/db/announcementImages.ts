import { eq } from "drizzle-orm";
import { db } from "@/drizzle/db";
import { AnnouncementImageTable } from "@/drizzle/schema";
import { deleteUploadThingFiles } from "@/lib/uploadthingServer";
import { revalidateAnnouncementCache } from "./cache/announcements";

// The pictures inside one announcement. Every write here refreshes the
// announcement's cache, because its images are part of what its page renders.
//
// Simpler than the lesson equivalent in one respect: a lesson image has to reach
// through section → course to find the cache tag to refresh, while an
// announcement belongs to nothing above it and the id it already has is the whole
// answer.

// Appends a batch of images, keeping the order they were selected in.
//
// One statement for the whole batch rather than a loop of single inserts: an
// author dropping thirty pictures in at once would otherwise pay thirty
// sequential round trips and thirty cache revalidations for what is one edit.
export async function insertAnnouncementImages(
    announcementId: string,
    urls: string[]
) {
    if (urls.length === 0) return [];

    // New images go to the end: read the current highest position once and count
    // up from there, since where each new row goes is already known from its
    // place in `urls`.
    const last = await db.query.AnnouncementImageTable.findFirst({
        columns: { order: true },
        where: eq(AnnouncementImageTable.announcementId, announcementId),
        orderBy: ({ order }, { desc }) => desc(order),
    });
    const nextOrder = last ? last.order + 1 : 0;

    const images = await db
        .insert(AnnouncementImageTable)
        .values(
            urls.map((url, index) => ({
                announcementId,
                url,
                order: nextOrder + index,
            }))
        )
        .returning();

    revalidateAnnouncementCache(announcementId);

    return images;
}

// Rewrites each image's position to match its new place in the list.
export async function updateAnnouncementImageOrders(imageIds: string[]) {
    const updated = await Promise.all(
        imageIds.map((id, index) =>
            db
                .update(AnnouncementImageTable)
                .set({ order: index })
                .where(eq(AnnouncementImageTable.id, id))
                .returning({
                    id: AnnouncementImageTable.id,
                    announcementId: AnnouncementImageTable.announcementId,
                })
        )
    );

    const announcementId = updated[0]?.[0]?.announcementId;
    if (announcementId == null) return;

    revalidateAnnouncementCache(announcementId);
}

export async function updateAnnouncementImageCaption(
    id: string,
    caption: string | null
) {
    const [updated] = await db
        .update(AnnouncementImageTable)
        .set({ caption })
        .where(eq(AnnouncementImageTable.id, id))
        .returning({
            id: AnnouncementImageTable.id,
            announcementId: AnnouncementImageTable.announcementId,
        });

    if (updated == null) throw new Error("Imagen no encontrada.");

    revalidateAnnouncementCache(updated.announcementId);

    return updated;
}

// Removes the row and the stored file behind it. The file is deleted after the
// row, and best-effort: a picture that has already left the page is better than a
// failed delete that puts it back.
export async function deleteAnnouncementImage(id: string) {
    const [deleted] = await db
        .delete(AnnouncementImageTable)
        .where(eq(AnnouncementImageTable.id, id))
        .returning();

    if (deleted == null) throw new Error("Imagen no encontrada.");

    await deleteUploadThingFiles(deleted.url);

    revalidateAnnouncementCache(deleted.announcementId);

    return deleted;
}
