import { db } from "@/drizzle/db";
import {
    CourseSectionTable,
    ImageLessonTable,
    LessonTable,
} from "@/drizzle/schema";
import { deleteUploadThingFiles } from "@/lib/uploadthingServer";
import { revalidateCourseSectionCache } from "./cache/courseSections";
import { eq } from "drizzle-orm";

export async function getNextCourseSectionOrder(courseId: string) {
    const section = await db.query.CourseSectionTable.findFirst({
        columns: {order: true},
        where: ({ courseId: courseIdCol }, { eq }) => eq(courseIdCol, courseId),
        orderBy: ({ order }, { desc }) => desc(order),
    })

    return section ? section.order + 1 : 0
}


export async function insertSection(data: typeof CourseSectionTable.$inferInsert) {
    const [newSection] = await db
    .insert(CourseSectionTable)
    .values(data)
    .returning();
    if (newSection == null) throw new Error("Error al crear la lesson.");
    
    revalidateCourseSectionCache({
        courseId: newSection.courseId,
        id: newSection.id,
    })

    return newSection;
}

export async function updateSection(
    id: string,
    data: Partial<typeof CourseSectionTable.$inferInsert>
) {
    const [updatedSection] = await db.update(CourseSectionTable).set(data).where(eq(CourseSectionTable.id, id)).returning();
    if (updatedSection == null ) throw new Error("Error al actualizar la Lesson.");
    revalidateCourseSectionCache({
        courseId: updatedSection.courseId,
        id: updatedSection.id
    });
    
    return updatedSection;
}

export async function updateSectionOrders(sectionIds: string[]) {
    const sections = await Promise.all(
        sectionIds.map((id, index) =>
            db
              .update(CourseSectionTable)
              .set({ order: index })
              .where(eq(CourseSectionTable.id, id))
              .returning({
                 courseId: CourseSectionTable.courseId,
                 id: CourseSectionTable.id,
              })
        )
    )

    sections.flat().forEach(({ id, courseId }) => {
        revalidateCourseSectionCache({ courseId, id})
    })
}

export async function deleteSection(id: string) {
    const { deletedSection, imageUrls } = await db.transaction(async trx => {
        // Collect URLs before the section cascade removes lessons and images.
        const images = await trx
            .select({ url: ImageLessonTable.url })
            .from(ImageLessonTable)
            .innerJoin(
                LessonTable,
                eq(ImageLessonTable.lessonId, LessonTable.id)
            )
            .where(eq(LessonTable.sectionId, id));

        const [deletedSection] = await trx
            .delete(CourseSectionTable)
            .where(eq(CourseSectionTable.id, id))
            .returning();

        if (deletedSection == null) {
            trx.rollback();
            throw new Error("Error al eliminar la clase.");
        }

        return {
            deletedSection,
            imageUrls: images.map(image => image.url),
        };
    });

    await deleteUploadThingFiles(imageUrls);

    revalidateCourseSectionCache({
        courseId: deletedSection.courseId,
        id: deletedSection.id,
    });

    return deletedSection;
}
