import "server-only";

import { db } from "@/drizzle/db";
import { CourseSectionTable, LessonTable } from "@/drizzle/schema";
import { and, eq, inArray } from "drizzle-orm";
import { cacheTag } from "next/cache";
import { userHasCourseAccess } from "@/app/features/courses/db/courseAccess";
import { getLessonIdTag } from "../db/cache/lessons";

// May this person mark this lesson complete?
//
// Deliberately a different question from "may they see it". A `preview` lesson
// is readable by anyone as a teaser, but recording progress against a course
// nobody has paid for would put rows in the progress table for people who do
// not have the course — and the "My Courses" page reads that table to decide
// what to list. Viewing is a courtesy; completing is a fact about a student.
//
// This is where the port diverges most from the reference implementation. There
// the check is a hand-rolled join against user_course_access, which answers only
// "did they buy it" and silently excludes every subscriber. Delegating to
// `userHasCourseAccess` instead gets purchases AND active subscriptions from the
// one place that already knows the rules, so the two can never disagree.
export async function canUpdateUserLessonCompleteStatus(
    // Null and undefined both mean "nobody is signed in": `getCurrentUser`
    // returns null, while a caller that never looked one up passes nothing.
    user: { userId: string | null | undefined },
    lessonId: string
) {
    if (user.userId == null) return false;

    const courseId = await getCompletableLessonCourseId(lessonId);
    if (courseId == null) return false;

    return userHasCourseAccess({ userId: user.userId, courseId });
}

// The course a lesson belongs to, but only if the lesson is actually reachable:
// a private lesson, or one inside a private section, is not part of the course
// as students see it and cannot be completed. Reached through the section, which
// is where the lesson's course is recorded.
//
// Not user-specific, so one cached entry per lesson serves everybody. It is kept
// separate from the access check above for exactly that reason — mixing the two
// would make a shared answer look like a per-user one.
async function getCompletableLessonCourseId(lessonId: string) {
    "use cache";
    cacheTag(getLessonIdTag(lessonId));

    const lesson = await db
        .select({ courseId: CourseSectionTable.courseId })
        .from(LessonTable)
        .innerJoin(
            CourseSectionTable,
            and(
                eq(CourseSectionTable.id, LessonTable.sectionId),
                eq(CourseSectionTable.status, "public")
            )
        )
        .where(
            and(
                eq(LessonTable.id, lessonId),
                inArray(LessonTable.status, ["public", "preview"])
            )
        )
        .limit(1);

    return lesson[0]?.courseId ?? null;
}
