import { getGlobalTag, getIdTag, getUserTag } from "@/lib/dataCache";
import { updateTag } from "next/cache";

export function getUserLessonCompleteGlobalTag() {
    return getGlobalTag("userLessonComplete");
}

export function getUserLessonCompleteIdTag({
    lessonId,
    userId,
}: {
    lessonId: string;
    userId: string;
}) {
    return getIdTag("userLessonComplete", `lesson:${lessonId}-user:${userId}`);
}

// Every completion belonging to one person. This is the tag the "My Courses"
// page will read under, because "which courses have I made progress in" is a
// question about a user rather than about any one lesson.
export function getUserLessonCompleteUserTag(userId: string) {
    return getUserTag("userLessonComplete", userId);
}

// Only an `updateTag` variant here, unlike the course access cache which also
// exposes an `expireTags` one. Completions are written from a Server Action and
// nowhere else — no webhook grants them — so the API that throws outside a
// Server Action is exactly the API this needs, and it gives the person clicking
// the button read-your-own-writes.
export function revalidateUserLessonCompleteCache({
    lessonId,
    userId,
}: {
    lessonId: string;
    userId: string;
}) {
    updateTag(getUserLessonCompleteGlobalTag());
    updateTag(getUserLessonCompleteIdTag({ lessonId, userId }));
    updateTag(getUserLessonCompleteUserTag(userId));
}
