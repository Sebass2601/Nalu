import { db } from "@/drizzle/db";
import { ImageLessonTable, LessonTable } from "@/drizzle/schema";
import { eq } from "drizzle-orm";
import { deleteUploadThingFiles } from "@/lib/uploadthingServer";
import { revalidateLessonCache } from "./cache/lessons";

// A lesson's images are part of the course's cached data, so any image change
// must revalidate that lesson's cache. To do that we need the courseId, which
// we reach through the lesson -> section relationship.
async function getLessonCourseId(lessonId: string) {
    const lesson = await db.query.LessonTable.findFirst({
        columns: { id: true },
        where: eq(LessonTable.id, lessonId),
        with: { section: { columns: { courseId: true } } },
    });
    return lesson?.section.courseId ?? null;
}

// Appends a batch of images to a lesson, keeping the order they were selected
// in.
//
// Written as one statement for the whole batch rather than a loop of single
// inserts. With the old three-image cap a loop cost at most three round trips
// and nobody noticed; without a cap, an author dropping thirty pictures in at
// once would pay thirty sequential inserts plus thirty cache revalidations for
// what is really one edit.
export async function insertLessonImages(lessonId: string, urls: string[]) {
    if (urls.length === 0) return [];

    // New images go to the end: find the current highest order and count up
    // from there. Read once for the batch, since the positions of the rows
    // being added are known from their place in `urls`.
    const last = await db.query.ImageLessonTable.findFirst({
        columns: { order: true },
        where: eq(ImageLessonTable.lessonId, lessonId),
        orderBy: ({ order }, { desc }) => desc(order),
    });
    const nextOrder = last ? last.order + 1 : 0;

    const images = await db
        .insert(ImageLessonTable)
        .values(
            urls.map((url, index) => ({
                lessonId,
                url,
                order: nextOrder + index,
            }))
        )
        .returning();

    const courseId = await getLessonCourseId(lessonId);
    if (courseId != null) revalidateLessonCache({ id: lessonId, courseId });

    return images;
}

export async function updateLessonImageOrders(imageIds: string[]) {
    // Rewrite each image's order to match its new position in the list.
    const updated = await Promise.all(
        imageIds.map((id, index) =>
            db
                .update(ImageLessonTable)
                .set({ order: index })
                .where(eq(ImageLessonTable.id, id))
                .returning({
                    id: ImageLessonTable.id,
                    lessonId: ImageLessonTable.lessonId,
                })
        )
    );

    const lessonId = updated[0]?.[0]?.lessonId;
    if (lessonId == null) return;

    const courseId = await getLessonCourseId(lessonId);
    if (courseId != null) revalidateLessonCache({ id: lessonId, courseId });
}

export async function updateLessonImageCaption(
    id: string,
    caption: string | null
) {
    const [updated] = await db
        .update(ImageLessonTable)
        .set({ caption })
        .where(eq(ImageLessonTable.id, id))
        .returning({
            id: ImageLessonTable.id,
            lessonId: ImageLessonTable.lessonId,
        });

    if (updated == null) throw new Error("Imagen no encontrada.");

    const courseId = await getLessonCourseId(updated.lessonId);
    if (courseId != null) {
        revalidateLessonCache({ id: updated.lessonId, courseId });
    }

    return updated;
}

export async function deleteLessonImage(id: string) {
    const [deleted] = await db
        .delete(ImageLessonTable)
        .where(eq(ImageLessonTable.id, id))
        .returning();

    if (deleted == null) throw new Error("Imagen no encontrada.");

    await deleteUploadThingFiles(deleted.url);

    const courseId = await getLessonCourseId(deleted.lessonId);
    if (courseId != null) {
        revalidateLessonCache({ id: deleted.lessonId, courseId });
    }

    return deleted;
}
