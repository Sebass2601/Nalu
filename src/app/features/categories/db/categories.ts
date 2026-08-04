import { db } from "@/drizzle/db";
import { CategoryTable, CourseTable } from "@/drizzle/schema";
import { and, eq, isNotNull, ne } from "drizzle-orm";
import { cacheTag } from "next/cache";
import {
    getCategoryGlobalTag,
    revalidateCategoryCache,
} from "./cache/categories";
import { revalidateCourseCache } from "@/app/features/courses/db/cache/courses";
import { doorwayLabel } from "@/components/ui/parallaxEntrances";

// Name of the partial unique index in schema/category.ts.
const DOORWAY_CONSTRAINT = "categories_doorway_unique";

// Raised when a save would put two categories at the same doorway. It carries
// who is already there so the admin is told which category to free up, rather
// than being left to hunt for it.
export class DoorwayTakenError extends Error {
    constructor(doorway: string, occupant: string | null) {
        const where = doorwayLabel(doorway) ?? `la puerta ${doorway}`;
        super(
            occupant == null
                ? `«${where}» ya está ocupada por otra categoría.`
                : `«${where}» ya está ocupada por «${occupant}».`
        );
        this.name = "DoorwayTakenError";
    }
}

// Postgres' unique_violation. The form disables doorways that are already
// taken, so reaching this means the list the admin saw had gone stale — two
// people editing at once, or a second tab left open.
function isUniqueViolation(error: unknown, constraint: string) {
    return (
        typeof error === "object" &&
        error != null &&
        (error as { code?: string }).code === "23505" &&
        (error as { constraint?: string }).constraint === constraint
    );
}

// Turns the database's unique violation into the error the admin sees. The
// occupant is looked up only once the save has already failed, so the happy
// path stays a single statement.
async function doorwayTaken(doorway: string, excludeId?: string) {
    const occupant = await db.query.CategoryTable.findFirst({
        columns: { name: true },
        where: excludeId
            ? and(
                  eq(CategoryTable.doorway, doorway),
                  ne(CategoryTable.id, excludeId)
              )
            : eq(CategoryTable.doorway, doorway),
    });

    return new DoorwayTakenError(doorway, occupant?.name ?? null);
}

// Every category that currently holds a doorway, for the admin form to grey
// out the ones already spoken for. Cached under the same tag as the rest of
// the category reads, so assigning a doorway refreshes it everywhere at once.
export async function getDoorwayOccupants() {
    "use cache";
    cacheTag(getCategoryGlobalTag());

    return db
        .select({ doorway: CategoryTable.doorway, name: CategoryTable.name })
        .from(CategoryTable)
        .where(isNotNull(CategoryTable.doorway));
}

export async function insertCategory(data: typeof CategoryTable.$inferInsert) {
    let newCategory;
    try {
        [newCategory] = await db.insert(CategoryTable).values(data).returning();
    } catch (error) {
        if (data.doorway && isUniqueViolation(error, DOORWAY_CONSTRAINT)) {
            throw await doorwayTaken(data.doorway);
        }
        throw error;
    }

    if (newCategory == null) throw new Error("Error al crear la categoría");
    revalidateCategoryCache(newCategory.id);

    return newCategory;
}

export async function updateCategory(
    id: string,
    data: typeof CategoryTable.$inferInsert
) {
    let updatedCategory;
    try {
        [updatedCategory] = await db
            .update(CategoryTable)
            .set(data)
            .where(eq(CategoryTable.id, id))
            .returning();
    } catch (error) {
        if (data.doorway && isUniqueViolation(error, DOORWAY_CONSTRAINT)) {
            // Excluding this category matters: a save that leaves the doorway
            // untouched must not report the category as blocking itself.
            throw await doorwayTaken(data.doorway, id);
        }
        throw error;
    }

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
