import "server-only";

import { db } from "@/drizzle/db";
import { CourseTable, UserCourseAccessTable } from "@/drizzle/schema";
import { and, eq } from "drizzle-orm";
import { cacheTag } from "next/cache";
import { getUSerCourseAccessUserTag } from "./cache/userCourseAccess";
import { getCourseIdTag } from "./cache/courses";
import { hasActiveSubscription } from "@/app/features/subscriptions/db/subscriptions";

// The single question every gated page asks: may this person read this course?
//
// There are two independent ways to earn access, and they are checked in the
// order that costs least:
//
//   1. They bought it. A row in user_course_access, written when a purchase
//      completes. Permanent — it survives a lapsed subscription, because
//      subscription access is never stored here.
//   2. They subscribe, AND the course is marked `includedInSubscription`.
//      Computed live, so removing a course from the subscription or letting a
//      subscription lapse takes effect immediately, with nothing to clean up.
//
// Ownership is checked first because someone who bought a course keeps it
// whatever their subscription is doing — and it avoids the subscription lookup
// entirely in that case.
export async function userHasCourseAccess({
    userId,
    courseId,
}: {
    userId: string;
    courseId: string;
}) {
    if (await userOwnsCourse({ userId, courseId })) return true;

    // Ask about the course before the subscription: a course outside the
    // subscription can be answered without touching subscription state at all.
    if (!(await courseIsInSubscription(courseId))) return false;

    return hasActiveSubscription(userId);
}

// Permanent, purchase-derived access.
async function userOwnsCourse({
    userId,
    courseId,
}: {
    userId: string;
    courseId: string;
}) {
    "use cache";
    cacheTag(getUSerCourseAccessUserTag(userId));

    const access = await db.query.UserCourseAccessTable.findFirst({
        columns: { userId: true },
        where: and(
            eq(UserCourseAccessTable.userId, userId),
            eq(UserCourseAccessTable.courseId, courseId)
        ),
    });

    return access != null;
}

// Whether the course is part of the subscription offering. Not user-specific,
// so this caches once per course and is shared across everyone.
//
// Exported because a locked lesson asks the same question for a different
// reason: not "may this person read it" but "is subscribing a way in at all",
// which decides whether the lock offers that route alongside buying.
export async function courseIsInSubscription(courseId: string) {
    "use cache";
    cacheTag(getCourseIdTag(courseId));

    const course = await db.query.CourseTable.findFirst({
        columns: { includedInSubscription: true },
        where: eq(CourseTable.id, courseId),
    });

    return course?.includedInSubscription ?? false;
}
