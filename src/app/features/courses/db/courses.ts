import { db } from "@/drizzle/db";
import { CourseTable } from "@/drizzle/schema";
import { revalidateCourseCache } from "./cache/courses";

export async function insertCourse(data: typeof CourseTable.$inferInsert) {
    const [newCourse] = await db.insert(CourseTable).values(data).returning();
    if (newCourse == null) throw new Error("Error al crear el curso");
    revalidateCourseCache(newCourse.id)

    return newCourse;
}