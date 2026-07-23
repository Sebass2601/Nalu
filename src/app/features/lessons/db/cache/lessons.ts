import { getGlobalTag, getIdTag, getUserTag } from "@/lib/dataCache";
import { updateTag } from "next/cache";

export function getLessonGlobalTag() {
    return getGlobalTag("lessons")
}

export function getLessonIdTag(id: string) {
    return getIdTag("lessons", id);
}

export function getLessonCourseTag(courseId: string) {
    return getUserTag("lessons", courseId)
}

export function revalidateLessonCache({
    id,
    courseId,
}: {
    id: string
    courseId: string
}) {
    updateTag(getLessonGlobalTag())
    updateTag(getLessonIdTag(id))
    updateTag(getLessonCourseTag(courseId))
}