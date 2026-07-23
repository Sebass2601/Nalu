import { getGlobalTag, getIdTag, getUserTag } from "@/lib/dataCache";
import { updateTag } from "next/cache";

export function getUSerCourseAccessGlobalTag() {
    return getGlobalTag("userCourseAccess")
}

export function getUSerCourseAccessIdTag({
    courseId,
    userId,
}: {
    courseId: string
    userId: string

}) {
    return getIdTag("userCourseAccess", `course:${courseId}-user:${userId}`);
}

export function getUSerCourseAccessUserTag(userId: string) {
    return getUserTag("userCourseAccess", userId)
}

export function revalidateUserCourseAccessCache({
    courseId,
    userId,
}: {
    courseId: string
    userId: string
}) {
    updateTag(getUSerCourseAccessGlobalTag())
    updateTag(getUSerCourseAccessIdTag({ courseId, userId }))
    updateTag(getUSerCourseAccessUserTag(userId))
}