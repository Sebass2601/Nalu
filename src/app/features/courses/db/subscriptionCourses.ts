import "server-only";

import { and, asc, count, eq, inArray, isNull, sql } from "drizzle-orm";
import { cacheTag } from "next/cache";
import { db } from "@/drizzle/db";
import {
    CategoryTable,
    CourseSectionTable,
    CourseTable,
    LessonTable,
} from "@/drizzle/schema";
import { getCourseGlobalTag } from "./cache/courses";
import { getCategoryGlobalTag } from "@/app/features/categories/db/cache/categories";
import { getCourseSectionGlobalTag } from "@/app/features/CourseSections/db/cache/courseSections";
import { getLessonGlobalTag } from "@/app/features/lessons/db/cache/lessons";

// One course as it appears in a subscription row. No price and no progress:
// these cards are shown to people who already have access, or who are being
// told what an offer contains, so neither figure means anything here.
export type SubscriptionCourse = {
    id: string;
    name: string;
    imageUrl: string | null;
    sectionCount: number;
    lessonCount: number;
    // Whether material is still going up week by week. Null on courses that
    // predate the column, and the card treats null and false alike.
    uploadedWeekly: boolean | null;
};

// One row of the band. `categoryId` is null for the catch-all row.
export type SubscriptionCategoryRow = {
    categoryId: string | null;
    categoryName: string;
    courses: SubscriptionCourse[];
};

// Heading for included courses that were never given a category. They get a row
// rather than being dropped: nothing inside the plan is allowed to be
// invisible, or an admin who flags a course and forgets to categorise it ships
// nothing and never finds out.
export const UNCATEGORIZED_ROW_NAME = "Otros cursos";

// URL slug for the catch-all row's "Ver todos" link. A literal is safe
// because every category id is a uuid, so this can never collide with one.
// This is a contract, not a local detail: the row that produces the link and
// the page that parses the slug back out of the URL both import it from
// here, so the two sides can never drift out of sync the way independent
// copies of the same string eventually do.
export const UNCATEGORIZED_SLUG = "uncategorized";

// Published sections and lessons per course, in one grouped pass.
//
// `count(distinct section.id)` because the join multiplies a section by each of
// its lessons. Unpublished material is filtered out on both sides: a card must
// not promise lessons nobody can open.
//
// Not itself cached — every caller is already inside a `"use cache"` scope, and
// caching on an array argument would key an entry per distinct id list.
async function getCourseCounts(courseIds: string[]) {
    const rows = await db
        .select({
            courseId: CourseSectionTable.courseId,
            sectionCount: sql<number>`count(distinct ${CourseSectionTable.id})::int`,
            lessonCount: count(LessonTable.id),
        })
        .from(CourseSectionTable)
        .innerJoin(
            LessonTable,
            and(
                eq(LessonTable.sectionId, CourseSectionTable.id),
                inArray(LessonTable.status, ["public", "preview"])
            )
        )
        .where(
            and(
                inArray(CourseSectionTable.courseId, courseIds),
                eq(CourseSectionTable.status, "public")
            )
        )
        .groupBy(CourseSectionTable.courseId);

    return new Map(
        rows.map(row => [
            row.courseId,
            { sectionCount: row.sectionCount, lessonCount: row.lessonCount },
        ])
    );
}

// Every course in the subscription, grouped into one row per category.
//
// Nothing here depends on who is asking, so a single cache entry serves every
// visitor — subscriber, prospect or signed out. The four tags cover every edit
// that can change what these rows say: flagging a course into or out of the
// plan, renaming a category, and publishing a section or a lesson (which moves
// the counts on a card).
export async function getSubscriptionCourseRows(): Promise<
    SubscriptionCategoryRow[]
> {
    "use cache";
    cacheTag(
        getCourseGlobalTag(),
        getCategoryGlobalTag(),
        getCourseSectionGlobalTag(),
        getLessonGlobalTag()
    );

    // Left, not inner: a course with no category still belongs in the band,
    // and an inner join would silently drop it.
    const rows = await db
        .select({
            id: CourseTable.id,
            name: CourseTable.name,
            imageUrl: CourseTable.imageUrl,
            uploadedWeekly: CourseTable.uploadedWeekly,
            categoryId: CategoryTable.id,
            categoryName: CategoryTable.name,
        })
        .from(CourseTable)
        .leftJoin(CategoryTable, eq(CategoryTable.id, CourseTable.categoryId))
        // Free classes are excluded even if somebody manages to set both flags.
        // The course form refuses to save a course with both, so this is the
        // belt to that pair of braces — and it states the rule where the band is
        // actually built: nothing already given away is advertised as a reason
        // to subscribe.
        .where(
            and(
                eq(CourseTable.includedInSubscription, true),
                eq(CourseTable.freeContent, false)
            )
        )
        .orderBy(asc(CourseTable.name));

    if (rows.length === 0) return [];

    const counts = await getCourseCounts(rows.map(row => row.id));

    // Grouped in JS rather than SQL: the query already returns courses in name
    // order, so pushing in sequence keeps each row alphabetical for free.
    const named = new Map<string, SubscriptionCategoryRow>();
    const uncategorized: SubscriptionCourse[] = [];

    for (const row of rows) {
        const course: SubscriptionCourse = {
            id: row.id,
            name: row.name,
            imageUrl: row.imageUrl,
            uploadedWeekly: row.uploadedWeekly,
            sectionCount: counts.get(row.id)?.sectionCount ?? 0,
            lessonCount: counts.get(row.id)?.lessonCount ?? 0,
        };

        if (row.categoryId == null || row.categoryName == null) {
            uncategorized.push(course);
            continue;
        }

        const existing = named.get(row.categoryId);
        if (existing == null) {
            named.set(row.categoryId, {
                categoryId: row.categoryId,
                categoryName: row.categoryName,
                courses: [course],
            });
        } else {
            existing.courses.push(course);
        }
    }

    // `localeCompare` with "es" so accented names sort where a Spanish reader
    // expects, which a raw byte sort would not do.
    const result = [...named.values()].sort((a, b) =>
        a.categoryName.localeCompare(b.categoryName, "es")
    );

    // Always last, whatever it is called alphabetically.
    if (uncategorized.length > 0) {
        result.push({
            categoryId: null,
            categoryName: UNCATEGORIZED_ROW_NAME,
            courses: uncategorized,
        });
    }

    return result;
}

// Every included course in one category, for that category's "Ver todos" page.
// `null` means the uncategorized catch-all.
//
// No category tag here, unlike the rows query: this one never reads
// `CategoryTable`, so a rename cannot change its result. The page that shows
// the heading reads the category itself and tags that read separately.
export async function getSubscriptionCoursesByCategory(
    categoryId: string | null
): Promise<SubscriptionCourse[]> {
    "use cache";
    cacheTag(
        getCourseGlobalTag(),
        getCourseSectionGlobalTag(),
        getLessonGlobalTag()
    );

    const rows = await db
        .select({
            id: CourseTable.id,
            name: CourseTable.name,
            imageUrl: CourseTable.imageUrl,
            uploadedWeekly: CourseTable.uploadedWeekly,
        })
        .from(CourseTable)
        .where(
            and(
                eq(CourseTable.includedInSubscription, true),
                // Same exclusion as the band this page is the "Ver todos" of,
                // so the two cannot disagree about what the subscription holds.
                eq(CourseTable.freeContent, false),
                categoryId == null
                    ? isNull(CourseTable.categoryId)
                    : eq(CourseTable.categoryId, categoryId)
            )
        )
        .orderBy(asc(CourseTable.name));

    if (rows.length === 0) return [];

    const counts = await getCourseCounts(rows.map(row => row.id));

    return rows.map(row => ({
        ...row,
        sectionCount: counts.get(row.id)?.sectionCount ?? 0,
        lessonCount: counts.get(row.id)?.lessonCount ?? 0,
    }));
}
