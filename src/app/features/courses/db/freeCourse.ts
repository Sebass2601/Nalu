import "server-only";

import { asc, eq, inArray } from "drizzle-orm";
import { cacheTag } from "next/cache";
import { db } from "@/drizzle/db";
import {
    CourseSectionTable,
    CourseTable,
    LessonTable,
} from "@/drizzle/schema";
import { getCourseGlobalTag } from "./cache/courses";
import { getCourseSectionGlobalTag } from "@/app/features/CourseSections/db/cache/courseSections";
import { getLessonGlobalTag } from "@/app/features/lessons/db/cache/lessons";
import { FREE_COURSE_NAME } from "../lib/freeCourseNames";

// The name of the course row is the whole link between the page and the data:
// create a course called exactly that in the admin panel and it becomes the free
// course. Rename it and the page goes back to its empty state — no error,
// nothing broken, just nothing to show — which is the trade for not having a
// column and a checkbox to mark it with.
//
// It lives in `lib/freeCourseNames` beside the title visitors actually read,
// because the two are no longer the same string and the distinction is easier to
// keep straight when they sit together.

// The free course as a visitor sees it: published classes in the admin's order,
// each with its published sections in order.
//
// Vocabulary, since the tables and the page disagree: a `courseSection` row is a
// "Clase" and a `lesson` row is a "Sección" — the same names the admin panel
// uses. The nesting is identical to a paid course, which is what lets the free
// course be edited with the same forms as everything else.
//
// `preview` sections are included and treated no differently from `public` ones.
// That status exists to mark the parts of a paid course given away as a teaser,
// and in a course where everything is given away it is a distinction with
// nothing on the other side of it. `private` is still honoured on both levels,
// so a class can be drafted in the admin panel without appearing here.
//
// Three global tags rather than tags keyed to this course's id: the id is not
// known until the query has run, so there is nothing to key on beforehand. The
// cost is that any course, class or lesson edit anywhere refreshes this entry —
// acceptable for one small query that every /newsletter request shares.
export async function getFreeCourseOutline() {
    "use cache";
    cacheTag(
        getCourseGlobalTag(),
        getCourseSectionGlobalTag(),
        getLessonGlobalTag()
    );

    return db.query.CourseTable.findFirst({
        columns: { id: true, name: true },
        where: eq(CourseTable.name, FREE_COURSE_NAME),
        with: {
            courseSections: {
                // `createdAt` is not drawn anywhere. It is here because it
                // decides where the page opens: the most recently added class
                // is the one visitors have come for.
                columns: { id: true, name: true, createdAt: true },
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

// The shape the menu and the section page both work from, named so neither has
// to restate it.
export type FreeCourseOutline = NonNullable<
    Awaited<ReturnType<typeof getFreeCourseOutline>>
>;
export type FreeCourseClass = FreeCourseOutline["courseSections"][number];
