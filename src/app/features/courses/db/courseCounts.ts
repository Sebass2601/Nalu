import "server-only";

import { db } from "@/drizzle/db";
import {
    CourseSectionTable,
    LessonTable,
    UserLessonCompleteTable,
} from "@/drizzle/schema";
import { and, count, eq, inArray, sql } from "drizzle-orm";

// How big a course is, and how far through it somebody is — the two numbers
// every course card draws under its title.
//
// Shared by "Mis cursos" and the free classes on /newsletter, which ask exactly
// the same two questions of exactly the same tables and would otherwise each
// keep a copy. The copies are what matter here rather than the line count: both
// queries filter on `status`, and a rule about what counts as published that is
// written down twice is a rule that will eventually be written down two
// different ways.
//
// Neither function caches. They are plain reads, and the two callers cache
// differently — one entry per user for the shelf, a global entry and a
// per-user entry for the free classes — so the decision belongs to them.
//
// Vocabulary: a `courseSection` row is a "Clase" and a `lesson` row is a
// "Sección", as in the admin panel.

// Published sections and lessons per course, counted in one pass.
//
// `countDistinct` on sections because the join multiplies a section by its
// lessons. A course with nothing published in it is absent from the result
// rather than present with zeroes — there is no row for it to appear on — so
// callers read the map with a `?? 0`.
export async function getPublishedLessonTotals(courseIds: string[]) {
    if (courseIds.length === 0) return new Map<string, CourseTotals>();

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

export type CourseTotals = { sectionCount: number; lessonCount: number };

// How many published lessons this person has ticked, per course.
//
// The status filters are the same ones above and are there for the same reason:
// a tick against a lesson that was later unpublished is not progress through the
// course as it stands today, and counting it would put the figure above the
// total.
export async function getCompletedLessonCounts({
    userId,
    courseIds,
}: {
    userId: string;
    courseIds: string[];
}) {
    if (courseIds.length === 0) return new Map<string, number>();

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
