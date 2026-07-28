import "server-only";

import { db } from "@/drizzle/db";
import {
    CourseSectionTable,
    CourseTable,
    LessonTable,
    UserLessonCompleteTable,
} from "@/drizzle/schema";
import { and, asc, eq, inArray } from "drizzle-orm";
import { cacheTag } from "next/cache";
import { getCourseIdTag } from "./cache/courses";
import { getCourseSectionCourseTag } from "@/app/features/CourseSections/db/cache/courseSections";
import { getLessonCourseTag } from "@/app/features/lessons/db/cache/lessons";
import { getUserLessonCompleteUserTag } from "@/app/features/lessons/db/cache/userLessonComplete";

// A course as a student sees it: the published sections in order, each with its
// published lessons in order. `preview` lessons are included — they are meant to
// be advertised — while private sections and lessons are absent entirely rather
// than shown as locked, because an unpublished lesson is not part of the course
// yet.
//
// Shared by the course layout's sidebar and the course's own page so the two can
// never disagree about what the course contains, and so the second one to ask
// pays nothing.
//
// Three tags, because three different edits change what this returns: the course
// itself being renamed, a section being added or reordered, and a lesson being
// published or moved.
export async function getCourseOutline(courseId: string) {
    "use cache";
    cacheTag(
        getCourseIdTag(courseId),
        getCourseSectionCourseTag(courseId),
        getLessonCourseTag(courseId)
    );

    return db.query.CourseTable.findFirst({
        columns: { id: true, name: true, description: true },
        where: eq(CourseTable.id, courseId),
        with: {
            courseSections: {
                columns: { id: true, name: true },
                where: eq(CourseSectionTable.status, "public"),
                orderBy: asc(CourseSectionTable.order),
                with: {
                    lessons: {
                        columns: { id: true, name: true, type: true },
                        where: inArray(LessonTable.status, [
                            "public",
                            "preview",
                        ]),
                        orderBy: asc(LessonTable.order),
                    },
                },
            },
        },
    });
}

// Every lesson this person has finished, across all courses.
//
// Deliberately not narrowed to one course. A student moving between courses in a
// single session reuses one cached list instead of building a separate one per
// course, and the whole list is invalidated by the same user tag either way. The
// caller filters it down to the lessons it is drawing.
export async function getCompletedLessonIds(userId: string) {
    "use cache";
    cacheTag(getUserLessonCompleteUserTag(userId));

    const completions = await db.query.UserLessonCompleteTable.findMany({
        columns: { lessonId: true },
        where: eq(UserLessonCompleteTable.userId, userId),
    });

    return completions.map(completion => completion.lessonId);
}

// How much of one course is done, for the progress line on the course page.
// Counting here rather than in the page keeps the "which lessons count" rule —
// published ones only — in the same file as the query that defines it.
export async function getCourseProgress({
    courseId,
    userId,
}: {
    courseId: string;
    userId: string;
}) {
    "use cache";
    cacheTag(
        getCourseSectionCourseTag(courseId),
        getLessonCourseTag(courseId),
        getUserLessonCompleteUserTag(userId)
    );

    const completed = await db
        .select({ lessonId: LessonTable.id })
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
                eq(CourseSectionTable.courseId, courseId)
            )
        )
        .where(eq(UserLessonCompleteTable.userId, userId));

    return completed.length;
}
