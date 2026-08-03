import "server-only";

import { getCheapestPurchasableProductForCourse } from "@/app/features/products/db/products";
import { hasActiveSubscription } from "@/app/features/subscriptions/db/subscriptions";
import { courseIsInSubscription, userOwnsCourse } from "../db/courseAccess";

// Whether this person can still be sold a course they are already reading, and
// which product to sell them.
//
// The offer exists for one situation only: someone whose access to a course
// comes from their subscription and would end with it. Buying the product that
// bundles it writes a permanent row in user_course_access, so the course stays
// on their shelf after the subscription lapses. That is the whole proposition,
// and every clause below is there to make sure it is actually true for the
// person being shown the button.
//
// Four conditions, all of which must hold:
//
//   1. Signed in. Nobody else has a subscription to be upgrading from.
//   2. They do NOT already own it. Selling a second permanent copy of something
//      already owned permanently would take money for nothing.
//   3. The course is in the subscription AND their subscription is live — this
//      is what makes their current access temporary. A course they can only see
//      because they bought it is not an upgrade; a lapsed subscriber cannot see
//      the course at all, so this never runs for them.
//   4. Something sells it right now. `getCheapestPurchasableProductForCourse`
//      is the same call a locked lesson makes: public products only, and only
//      ones synced to Stripe, so the button can never lead to a dead checkout.
//
// Returns null the moment any of those fails, which every caller reads as
// "render nothing".
export async function getCourseUpgradeOffer({
    userId,
    courseId,
}: {
    userId: string | null;
    courseId: string;
}) {
    if (userId == null) return null;

    // Ownership first, mirroring `userHasCourseAccess`: it is the one answer
    // that settles the question on its own, and it costs a single user-tagged
    // read.
    if (await userOwnsCourse({ userId, courseId })) return null;

    // The course before the subscription, again as `userHasCourseAccess` does —
    // a course outside the subscription is answered without touching
    // subscription state at all.
    if (!(await courseIsInSubscription(courseId))) return null;
    if (!(await hasActiveSubscription(userId))) return null;

    return getCheapestPurchasableProductForCourse(courseId);
}
