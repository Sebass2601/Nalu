import { db } from "@/drizzle/db";
import { CategoryTable, CourseTable } from "@/drizzle/schema";
import { eq } from "drizzle-orm";
import { revalidateCategoryCache } from "./cache/categories";
import { revalidateCourseCache } from "@/app/features/courses/db/cache/courses";

export async function insertCategory(data: typeof CategoryTable.$inferInsert) {
    const [newCategory] = await db
        .insert(CategoryTable)
        .values(data)
        .returning();
    if (newCategory == null) throw new Error("Error al crear la categoría");
    revalidateCategoryCache(newCategory.id);

    return newCategory;
}

export async function updateCategory(
    id: string,
    data: typeof CategoryTable.$inferInsert
) {
    const [updatedCategory] = await db
        .update(CategoryTable)
        .set(data)
        .where(eq(CategoryTable.id, id))
        .returning();
    if (updatedCategory == null)
        throw new Error("Error al actualizar la categoría");
    revalidateCategoryCache(updatedCategory.id);

    return updatedCategory;
}

export async function deleteCategory(id: string) {
    // Grab the courses that point at this category *before* deleting it: the
    // "set null" foreign key will un-categorize them automatically, and we need
    // their ids to refresh each course's cache afterwards.
    const affectedCourses = await db
        .select({ id: CourseTable.id })
        .from(CourseTable)
        .where(eq(CourseTable.categoryId, id));

    const [deletedCategory] = await db
        .delete(CategoryTable)
        .where(eq(CategoryTable.id, id))
        .returning();
    if (deletedCategory == null)
        throw new Error("Error al eliminar la categoría");

    revalidateCategoryCache(deletedCategory.id);
    affectedCourses.forEach(course => revalidateCourseCache(course.id));

    return deletedCategory;
}
