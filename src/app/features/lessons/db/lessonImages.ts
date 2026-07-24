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

export async function getLessonImageCount(lessonId: string) {
    const images = await db.query.ImageLessonTable.findMany({
        columns: { id: true },
        where: eq(ImageLessonTable.lessonId, lessonId),
    });
    return images.length;
}

export async function insertLessonImage({
    lessonId,
    url,
}: {
    lessonId: string;
    url: string;
}) {
    // New images go to the end: find the current highest order and add one.
    const last = await db.query.ImageLessonTable.findFirst({
        columns: { order: true },
        where: eq(ImageLessonTable.lessonId, lessonId),
        orderBy: ({ order }, { desc }) => desc(order),
    });
    const order = last ? last.order + 1 : 0;

    const [image] = await db
        .insert(ImageLessonTable)
        .values({ lessonId, url, order })
        .returning();

    const courseId = await getLessonCourseId(lessonId);
    if (courseId != null) revalidateLessonCache({ id: lessonId, courseId });

    return image;
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
