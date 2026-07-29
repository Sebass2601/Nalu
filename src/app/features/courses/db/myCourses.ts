import "server-only";

import { db } from "@/drizzle/db";
import {
    CategoryTable,
    CourseSectionTable,
    CourseTable,
    LessonTable,
    UserCourseAccessTable,
    UserLessonCompleteTable,
} from "@/drizzle/schema";
import { and, count, eq, inArray, sql } from "drizzle-orm";
import { cacheTag } from "next/cache";
import { getCourseGlobalTag } from "./cache/courses";
import { getCategoryGlobalTag } from "@/app/features/categories/db/cache/categories";
import { getCourseSectionGlobalTag } from "@/app/features/CourseSections/db/cache/courseSections";
import { getLessonGlobalTag } from "@/app/features/lessons/db/cache/lessons";
import { getUSerCourseAccessUserTag } from "./cache/userCourseAccess";
import { getUserLessonCompleteUserTag } from "@/app/features/lessons/db/cache/userLessonComplete";
import { getSubscriptionUserTag } from "@/app/features/subscriptions/db/cache/subscriptions";
import { hasActiveSubscription } from "@/app/features/subscriptions/db/subscriptions";

export type MyCourse = {
    id: string;
    name: string;
    description: string;
    imageUrl: string | null;
    categoryName: string | null;
    sectionCount: number;
    lessonCount: number;
    completedCount: number;
};

// Everything this person can open from "Mis cursos", with enough about each to
// draw its card.
//
// Two ways in, and they are deliberately NOT the same test:
//
//   1. Bought it. Always listed, finished or untouched. It was paid for once and
//      it stays on the shelf.
//   2. Included in the subscription, AND started. A subscription can cover the
//      whole catalogue, so listing all of it would turn this page into a second
//      copy of the shop — the shelf would fill with courses nobody asked for and
//      the ones actually being worked through would be lost among them. Having
//      finished a lesson is the signal that a subscriber chose this course.
//
// "Started" therefore means at least one completed lesson. It is the only signal
// available: the app records completions, not visits, so a course opened and
// read but never marked stays unstarted. That is a real limitation of the
// underlying data rather than a choice made here.
//
// A course that was bought AND is in the subscription appears once, under rule
// 1, so buying it keeps it on the shelf even before it is started.
export async function getMyCourses(userId: string): Promise<MyCourse[]> {
    "use cache";
    // Who this person is allowed to see, and how far they have got.
    cacheTag(
        getUSerCourseAccessUserTag(userId),
        getUserLessonCompleteUserTag(userId),
        getSubscriptionUserTag(userId)
    );
    // What the courses themselves say — an admin publishing a lesson changes the
    // totals on these cards, and renaming a category changes their labels.
    cacheTag(
        getCourseGlobalTag(),
        getCourseSectionGlobalTag(),
        getLessonGlobalTag(),
        getCategoryGlobalTag()
    );

    const [purchasedIds, startedIds] = await Promise.all([
        getPurchasedCourseIds(userId),
        getStartedCourseIds(userId),
    ]);

    // Only worth asking about the subscription if there is a started course it
    // could possibly unlock.
    const subscriptionIds =
        startedIds.length > 0 && (await hasActiveSubscription(userId))
            ? await getSubscriptionCourseIds(startedIds)
            : [];

    const visibleIds = [...new Set([...purchasedIds, ...subscriptionIds])];
    if (visibleIds.length === 0) return [];

    const [courses, totals, completed] = await Promise.all([
        getCourseCards(visibleIds),
        getLessonTotals(visibleIds),
        getCompletedCounts({ userId, courseIds: visibleIds }),
    ]);

    return courses.map(course => ({
        ...course,
        sectionCount: totals.get(course.id)?.sectionCount ?? 0,
        lessonCount: totals.get(course.id)?.lessonCount ?? 0,
        completedCount: completed.get(course.id) ?? 0,
    }));
}

async function getPurchasedCourseIds(userId: string) {
    const rows = await db
        .select({ courseId: UserCourseAccessTable.courseId })
        .from(UserCourseAccessTable)
        .where(eq(UserCourseAccessTable.userId, userId));

    return rows.map(row => row.courseId);
}

// Courses where this person has completed at least one published lesson. The
// status filters matter: progress against a lesson that was later unpublished
// should not keep a course on the shelf.
async function getStartedCourseIds(userId: string) {
    const rows = await db
        .selectDistinct({ courseId: CourseSectionTable.courseId })
        .from(UserLessonCompleteTable)
        .innerJoin(
            LessonTable,
            and(
                eq(LessonTable.id, UserLessonCompleteTable.lessonId),
                inArray(LessonTable.status, ["public", "preview"])
            )
        )
        .innerJoin(
            CourseSectionTable,
            and(
                eq(CourseSectionTable.id, LessonTable.sectionId),
                eq(CourseSectionTable.status, "public")
            )
        )
        .where(eq(UserLessonCompleteTable.userId, userId));

    return rows.map(row => row.courseId);
}

// Which of the started courses the subscription actually covers. Narrowed to
// those ids rather than asking for every subscription course, because the
// unstarted ones are not going on this page anyway.
async function getSubscriptionCourseIds(startedIds: string[]) {
    const rows = await db
        .select({ id: CourseTable.id })
        .from(CourseTable)
        .where(
            and(
                inArray(CourseTable.id, startedIds),
                eq(CourseTable.includedInSubscription, true)
            )
        );

    return rows.map(row => row.id);
}

async function getCourseCards(courseIds: string[]) {
    return db
        .select({
            id: CourseTable.id,
            name: CourseTable.name,
            description: CourseTable.description,
            imageUrl: CourseTable.imageUrl,
            categoryName: CategoryTable.name,
        })
        .from(CourseTable)
        // Left, not inner: a course with no category still belongs on the shelf.
        .leftJoin(CategoryTable, eq(CategoryTable.id, CourseTable.categoryId))
        .where(inArray(CourseTable.id, courseIds))
        .orderBy(CourseTable.name);
}

// Published sections and lessons per course, counted in one pass. `countDistinct`
// on sections because the join multiplies a section by its lessons.
async function getLessonTotals(courseIds: string[]) {
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

async function getCompletedCounts({
    userId,
    courseIds,
}: {
    userId: string;
    courseIds: string[];
}) {
    const rows = await db
        .select({
            courseId: CourseSectionTable.courseId,
            completedCount: count(UserLessonCompleteTable.lessonId),
        })
        .from(UserLessonCompleteTable)
        .innerJoin(
            LessonTable,
            and(
                eq(LessonTable.id, UserLessonCompleteTable.lessonId),
                inArray(LessonTable.status, ["public", "preview"])
            )
        )
        .innerJoin(
            CourseSectionTable,
            and(
                eq(CourseSectionTable.id, LessonTable.sectionId),
                eq(CourseSectionTable.status, "public"),
                inArray(CourseSectionTable.courseId, courseIds)
            )
        )
        .where(eq(UserLessonCompleteTable.userId, userId))
        .groupBy(CourseSectionTable.courseId);

    return new Map(rows.map(row => [row.courseId, row.completedCount]));
}
