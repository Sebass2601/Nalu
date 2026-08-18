import "server-only";

import { db } from "@/drizzle/db";
import { CourseTable, UserCourseAccessTable } from "@/drizzle/schema";
import { and, eq, inArray, isNotNull } from "drizzle-orm";
import { cacheTag } from "next/cache";
import { getUSerCourseAccessUserTag } from "./cache/userCourseAccess";
import { getCourseIdTag } from "./cache/courses";
import { hasActiveSubscription } from "@/app/features/subscriptions/db/subscriptions";

// The single question every gated page asks: may this person read this course?
//
// There are three independent ways in, checked in this order:
//
//   1. The course is marked `freeContent`. Free to everybody, and that is the
//      whole of the test — no account, no purchase, no subscription.
//   2. They bought it. A row in user_course_access, written when a purchase
//      completes. Permanent — it survives a lapsed subscription, because
//      subscription access is never stored here.
//   3. They subscribe, AND the course is marked `includedInSubscription`.
//      Computed live, so removing a course from the subscription or letting a
//      subscription lapse takes effect immediately, with nothing to clean up.
//
// Free content goes first, and that placement is the point rather than an
// optimisation. It is the only one of the three that can be answered without
// knowing who is asking, so putting it anywhere below the `userId` guard would
// mean a signed-out visitor was refused before the question that would have let
// them in was ever asked.
//
// `userId` is therefore nullable here, where it used to be a plain string. Every
// caller that previously wrote `userId != null && await userHasCourseAccess(…)`
// can now simply ask, and gets the free-content answer it used to skip past.
//
// Ownership is checked before the subscription because someone who bought a
// course keeps it whatever their subscription is doing — and it avoids the
// subscription lookup entirely in that case.
export async function userHasCourseAccess({
    userId,
    courseId,
}: {
    // Null and undefined both mean "nobody is signed in", matching the shape
    // `getCurrentUser` returns and what a caller that never looked one up has.
    userId: string | null | undefined;
    courseId: string;
}) {
    if (await courseIsFreeContent(courseId)) return true;

    // Nothing below here can be true of a stranger.
    if (userId == null) return false;

    if (await userOwnsCourse({ userId, courseId })) return true;

    // Ask about the course before the subscription: a course outside the
    // subscription can be answered without touching subscription state at all.
    if (!(await courseIsInSubscription(courseId))) return false;

    return hasActiveSubscription(userId);
}

// Permanent, purchase-derived access.
//
// Exported because the upgrade offer asks the same question with the opposite
// intent: not "may they read it" but "have they already bought it", which is
// what decides whether there is anything left to sell them.
export async function userOwnsCourse({
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

// Whether an admin has handed this person any of these courses by hand.
//
// `grantedBy IS NOT NULL` is the whole definition of a manual grant — the same
// rule `accessOrigin` states in `lib/courseAccessGrant` and
// `revokeManualCourseAccess` writes into its WHERE clause. It is expressed in
// SQL here for the same reason it is there: the question is "does such a row
// exist", and fetching every access row to decide it in JavaScript would be
// reading a table to answer a yes/no.
//
// The two kinds of row cannot be confused. A purchase writes NULL, and buying a
// course that was previously granted by hand promotes the row by overwriting
// `grantedBy` with NULL — see `addUserCourseAccess` — so a manual row is always
// access nobody paid for.
//
// Any one course is enough. The product page uses this to decide whether to
// offer the product for sale at all, and somebody who was given part of a
// bundle should not be sold the bundle.
export async function userHasManualCourseAccess({
    userId,
    courseIds,
}: {
    userId: string;
    courseIds: string[];
}) {
    "use cache";
    // Only this person's grants matter, and granting or revoking one already
    // expires this tag — see `userCourseAccessTags`.
    cacheTag(getUSerCourseAccessUserTag(userId));

    // A product bundling no courses cannot have been granted by hand. Guarded
    // rather than left to `inArray`, which has no rows to compare against and
    // would be asking the database a question with a known answer.
    if (courseIds.length === 0) return false;

    const access = await db.query.UserCourseAccessTable.findFirst({
        columns: { courseId: true },
        where: and(
            eq(UserCourseAccessTable.userId, userId),
            inArray(UserCourseAccessTable.courseId, courseIds),
            isNotNull(UserCourseAccessTable.grantedBy)
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
    return (await getCourseGiveawayFlags(courseId)).includedInSubscription;
}

// Whether this is one of the free classes on /newsletter, and therefore open to
// everyone.
//
// Exported for the same kind of reason as the one above: /newsletter's own
// gallery and the course page both need the answer for reasons other than
// gating a lesson body.
export async function courseIsFreeContent(courseId: string) {
    return (await getCourseGiveawayFlags(courseId)).freeContent;
}

// The two "who gets this without paying" columns, read together.
//
// One cached row rather than a cached read per flag: `userHasCourseAccess` asks
// about both on the way through a paid course, and two `findFirst` calls against
// the same row keyed by the same tag would be two cache entries holding halves
// of one answer. Not user-specific, so a single entry serves everybody.
//
// Private, and the two exports above are the interface — callers ask a question
// and get a boolean, rather than receiving a row and deciding what it means.
async function getCourseGiveawayFlags(courseId: string) {
    "use cache";
    cacheTag(getCourseIdTag(courseId));

    const course = await db.query.CourseTable.findFirst({
        columns: { includedInSubscription: true, freeContent: true },
        where: eq(CourseTable.id, courseId),
    });

    // A course that does not exist gives nothing away. Both callers treat that
    // the same as a course that exists and is not on offer, which is the right
    // answer either way: there is nothing to let anyone into.
    return {
        includedInSubscription: course?.includedInSubscription ?? false,
        freeContent: course?.freeContent ?? false,
    };
}
