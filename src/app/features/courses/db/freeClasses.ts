import "server-only";

import { db } from "@/drizzle/db";
import { CourseTable } from "@/drizzle/schema";
import { eq } from "drizzle-orm";
import { cacheTag } from "next/cache";
import { getCourseGlobalTag } from "./cache/courses";
import { getCourseSectionGlobalTag } from "@/app/features/CourseSections/db/cache/courseSections";
import { getLessonGlobalTag } from "@/app/features/lessons/db/cache/lessons";
import { getUserLessonCompleteUserTag } from "@/app/features/lessons/db/cache/userLessonComplete";
import {
    getCompletedLessonCounts,
    getPublishedLessonTotals,
} from "./courseCounts";
import { orderFreeClasses } from "../lib/courseProgressOrder";

// The free classes on /newsletter: every course marked `freeContent`, with
// enough about each to draw its card, in the order that page wants them.
//
// A course row, but read as a single class — the convention is one Clase per
// free course, which is why the card says "Ver clase" and why the page is a
// gallery of classes rather than a shelf of courses. Nothing enforces it: a
// free course with three Clases in it renders perfectly well and simply reports
// what it holds.
//
// This is what replaced the old arrangement, where /newsletter found its course
// by matching `name` against a hard-coded constant. Renaming that course in the
// admin panel emptied the page with no error and nothing to see; a column and a
// checkbox cannot be broken by a rename.

export type FreeClass = {
    id: string;
    name: string;
    imageUrl: string | null;
    // Whether material is still going up week by week. Null on courses that
    // predate that column, and the card treats null and false alike.
    uploadedWeekly: boolean | null;
    sectionCount: number;
    lessonCount: number;
    // How many published sections this reader has ticked. Always 0 for a
    // signed-out visitor, who then sees no progress bar on any card.
    completedCount: number;
};

// `userId` is nullable because this page is open to strangers, which is the
// whole point of the free classes. A stranger's progress is not looked up at
// all — there is nobody to look it up for — so they get every card unmarked and
// the newest class first.
export async function getFreeClasses(
    userId: string | null | undefined
): Promise<FreeClass[]> {
    const courses = await getFreeClassCards();
    if (courses.length === 0) return [];

    const completed =
        userId == null
            ? new Map<string, number>()
            : await getFreeClassProgress({
                  userId,
                  courseIds: courses.map(course => course.id),
              });

    // Ordered here rather than in SQL. The rule is about bands — half-read,
    // untouched, finished — and it is worth having as a pure function with
    // tests around its corners; see `orderFreeClasses`.
    const ordered = orderFreeClasses(
        courses.map(course => ({
            ...course,
            completedCount: completed.get(course.id) ?? 0,
        }))
    );

    // `createdAt` drops out here. It decides the order and nothing draws it, so
    // it never reaches the card.
    return ordered.map(card => ({
        id: card.id,
        name: card.name,
        imageUrl: card.imageUrl,
        uploadedWeekly: card.uploadedWeekly,
        sectionCount: card.sectionCount,
        lessonCount: card.lessonCount,
        completedCount: card.completedCount,
    }));
}

// The classes themselves, and their sizes. Not user-specific, so one cached
// entry serves every visitor — which is most of the work of this page, done
// once for everybody.
//
// Three global tags rather than tags keyed to particular courses: which courses
// are free is exactly what this query is asking, so there is no id to key on
// beforehand. The cost is that any course, class or section edit anywhere
// refreshes this entry, which is the same trade the page it replaced made.
async function getFreeClassCards() {
    "use cache";
    cacheTag(
        getCourseGlobalTag(),
        getCourseSectionGlobalTag(),
        getLessonGlobalTag()
    );

    const courses = await db
        .select({
            id: CourseTable.id,
            name: CourseTable.name,
            imageUrl: CourseTable.imageUrl,
            uploadedWeekly: CourseTable.uploadedWeekly,
            // Not drawn anywhere. It is here because it decides the order
            // within each band, newest first.
            createdAt: CourseTable.createdAt,
        })
        .from(CourseTable)
        .where(eq(CourseTable.freeContent, true));

    if (courses.length === 0) return [];

    const totals = await getPublishedLessonTotals(
        courses.map(course => course.id)
    );

    // A class with nothing published in it counts as zero rather than being
    // dropped. It still belongs on the page — it is a class waiting to be
    // filled, and the admin has already said it is free.
    return courses.map(course => ({
        ...course,
        sectionCount: totals.get(course.id)?.sectionCount ?? 0,
        lessonCount: totals.get(course.id)?.lessonCount ?? 0,
    }));
}

// How far this reader has got through each of them.
//
// Its own cached read, keyed to the one tag that changes when they tick a
// section. Kept apart from the query above so that finishing a section
// refreshes this person's progress and not the class list everybody shares.
async function getFreeClassProgress({
    userId,
    courseIds,
}: {
    userId: string;
    courseIds: string[];
}) {
    "use cache";
    cacheTag(getUserLessonCompleteUserTag(userId));

    return getCompletedLessonCounts({ userId, courseIds });
}
