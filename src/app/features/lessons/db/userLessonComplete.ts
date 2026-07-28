import { db } from "@/drizzle/db";
import { UserLessonCompleteTable } from "@/drizzle/schema";
import { and, eq } from "drizzle-orm";
import { revalidateUserLessonCompleteCache } from "./cache/userLessonComplete";

// Records or clears one person's completion of one lesson.
//
// The table is nothing but the pair (userId, lessonId) as its primary key, so
// "complete" is the presence of a row and "incomplete" is its absence. That
// makes the whole operation an insert or a delete, with no state to reconcile.
//
// Both halves are idempotent, which matters because the video player fires this
// on its own when a video ends: `onConflictDoNothing` absorbs a second insert,
// and deleting a row that is not there simply matches nothing.
//
// `returning()` is what tells the two apart from a no-op. An insert that hit the
// conflict clause and a delete that matched nothing both come back empty, and
// there is no reason to invalidate caches for a change that did not happen.
export async function updateLessonCompleteStatus({
    lessonId,
    userId,
    complete,
}: {
    lessonId: string;
    userId: string;
    complete: boolean;
}) {
    const [completion] = complete
        ? await db
              .insert(UserLessonCompleteTable)
              .values({ lessonId, userId })
              .onConflictDoNothing()
              .returning()
        : await db
              .delete(UserLessonCompleteTable)
              .where(
                  and(
                      eq(UserLessonCompleteTable.lessonId, lessonId),
                      eq(UserLessonCompleteTable.userId, userId)
                  )
              )
              .returning();

    if (completion == null) return;

    revalidateUserLessonCompleteCache({
        lessonId: completion.lessonId,
        userId: completion.userId,
    });

    return completion;
}
