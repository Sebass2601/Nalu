import "server-only";

import { and, asc, eq, inArray } from "drizzle-orm";
import { cacheTag } from "next/cache";
import { db } from "@/drizzle/db";
import { ImageLessonTable, LessonTable } from "@/drizzle/schema";
import { getLessonIdTag } from "./cache/lessons";

// One lesson with everything needed to render it: the video's key and shape, the
// writing, the pictures in order, and the name of the section it belongs to.
//
// The publish rules live here rather than in the pages, and there are two of
// them because there are two switches in the admin panel:
//
//   - a private lesson is not returned at all, so it 404s rather than appearing
//     locked — an unpublished lesson is not part of the course yet;
//   - nor is a lesson inside a private section, whatever the lesson's own status
//     says, because publishing a lesson cannot publish the class around it.
//
// Shared by the paid course viewer and the free course at /clases-gratuitas. They
// differ over who may *read* what comes back — that check belongs to each page,
// because it is request-time work about the viewer — but they must never differ
// over what counts as published, and a second copy of these two filters is
// exactly the kind of thing that drifts apart one edit at a time.
//
// Cached and tagged by lesson id, so editing a lesson refreshes it everywhere it
// is drawn. Note what is NOT here: the video's playback URL. This is a
// `"use cache"` scope, replayed across requests for anyone whose arguments
// match, so a signed URL minted inside it would be one viewer's token handed to
// the next. Callers pass the key to `getLessonVideoUrl` at request time instead.
export async function getPublishedLesson(id: string) {
    "use cache";
    cacheTag(getLessonIdTag(id));

    const lesson = await db.query.LessonTable.findFirst({
        columns: {
            id: true,
            name: true,
            description: true,
            type: true,
            videoKey: true,
            videoWidth: true,
            videoHeight: true,
            content: true,
            status: true,
            sectionId: true,
            order: true,
        },
        where: and(
            eq(LessonTable.id, id),
            inArray(LessonTable.status, ["public", "preview"])
        ),
        with: {
            section: { columns: { name: true, courseId: true, status: true } },
            images: {
                columns: { id: true, url: true, caption: true },
                orderBy: asc(ImageLessonTable.order),
            },
        },
    });

    if (lesson == null) return null;

    if (lesson.section.status !== "public") return null;

    // The section is flattened away: every caller wants its name to print above
    // the lesson and its course id to check the URL with, and neither wants to
    // reach through a nested object for them.
    const { section, ...rest } = lesson;

    return {
        ...rest,
        sectionName: section.name,
        courseId: section.courseId,
    };
}
