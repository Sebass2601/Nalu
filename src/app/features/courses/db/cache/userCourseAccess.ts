import { expireTags, getGlobalTag, getIdTag, getUserTag } from "@/lib/dataCache";
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

// The three tags any single grant or revocation affects. Kept in one place so
// the two invalidation entry points below can never drift apart.
function userCourseAccessTags({
    courseId,
    userId,
}: {
    courseId: string
    userId: string
}) {
    return [
        getUSerCourseAccessGlobalTag(),
        getUSerCourseAccessIdTag({ courseId, userId }),
        getUSerCourseAccessUserTag(userId),
    ]
}

// For Server Actions. `updateTag` gives read-your-own-writes but throws
// anywhere else.
export function revalidateUserCourseAccessCache(args: {
    courseId: string
    userId: string
}) {
    userCourseAccessTags(args).forEach(updateTag)
}

// For Route Handlers — specifically the Hotmart webhook, which is where course
// access is actually granted. Same tags, an API that is legal in that context.
export function expireUserCourseAccessCache(args: {
    courseId: string
    userId: string
}) {
    expireTags(...userCourseAccessTags(args))
}