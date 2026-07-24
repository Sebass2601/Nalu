import { db } from "@/drizzle/db";
import {
    CourseProductTable,
    CourseSectionTable,
    CourseTable,
    ImageLessonTable,
    LessonTable,
} from "@/drizzle/schema";
import { deleteUploadThingFiles } from "@/lib/uploadthingServer";
import { revalidateCourseCache } from "./cache/courses";
import { eq } from "drizzle-orm";

const COURSE_PRODUCT_FOREIGN_KEY_CONSTRAINT =
    "course_products_courseId_courses_id_fk";

function isCourseProductForeignKeyError(error: unknown) {
    const seen = new Set<unknown>();
    let current = error;

    while (
        current != null &&
        typeof current === "object" &&
        !seen.has(current)
    ) {
        seen.add(current);

        if (
            "code" in current &&
            current.code === "23503" &&
            "constraint" in current &&
            current.constraint === COURSE_PRODUCT_FOREIGN_KEY_CONSTRAINT
        ) {
            return true;
        }

        current = "cause" in current ? current.cause : null;
    }

    return false;
}

export async function insertCourse(data: typeof CourseTable.$inferInsert) {
    const [newCourse] = await db.insert(CourseTable).values(data).returning();
    if (newCourse == null) throw new Error("Error al crear el curso");
    revalidateCourseCache(newCourse.id);

    return newCourse;
}

export async function updateCourse(id: string, data: typeof CourseTable.$inferInsert) {
    const [updatedCourse] = await db.update(CourseTable).set(data).where(eq(CourseTable.id, id)).returning();
    if (updatedCourse == null) throw new Error("Error al actualizar el curso");
    revalidateCourseCache(updatedCourse.id);

    return updatedCourse
}

export async function deleteCourse(id: string) {
    try {
        const result = await db.transaction(async trx => {
            const [courseProduct] = await trx
                .select({ courseId: CourseProductTable.courseId })
                .from(CourseProductTable)
                .where(eq(CourseProductTable.courseId, id))
                .limit(1);

            if (courseProduct != null) {
                return {
                    success: false,
                    reason: "course-in-product",
                } as const;
            }

            // Collect every descendant image URL before cascading the course.
            const images = await trx
                .select({ url: ImageLessonTable.url })
                .from(ImageLessonTable)
                .innerJoin(
                    LessonTable,
                    eq(ImageLessonTable.lessonId, LessonTable.id)
                )
                .innerJoin(
                    CourseSectionTable,
                    eq(LessonTable.sectionId, CourseSectionTable.id)
                )
                .where(eq(CourseSectionTable.courseId, id));

            const [deletedCourse] = await trx
                .delete(CourseTable)
                .where(eq(CourseTable.id, id))
                .returning();

            if (deletedCourse == null) {
                trx.rollback();
                throw new Error("Error al eliminar el curso");
            }

            return {
                success: true,
                deletedCourse,
                imageUrls: images.map(image => image.url),
            } as const;
        });

        if (!result.success) {
            return result;
        }

        await deleteUploadThingFiles(result.imageUrls);
        revalidateCourseCache(result.deletedCourse.id);

        return { success: true } as const;
    } catch (error) {
        if (isCourseProductForeignKeyError(error)) {
            return {
                success: false,
                reason: "course-in-product",
            } as const;
        }

        throw error;
    }
}
