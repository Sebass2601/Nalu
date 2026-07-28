import { db } from "@/drizzle/db";
import {
    ProductTable,
    PurchaseTable,
    UserCourseAccessTable,
} from "@/drizzle/schema";
import { and, eq, inArray, isNull } from "drizzle-orm";
import { expireUserCourseAccessCache } from "./cache/userCourseAccess";

// Grants permanent access to a set of courses. This is what a completed
// one-time purchase writes. Subscription access is never written here — it is
// computed live from `courses.includedInSubscription`, so it disappears on its
// own when a subscription lapses, and cannot accidentally delete access someone
// bought outright.
//
// `onConflictDoNothing` is what makes this safe to run twice. Stripe retries
// webhook deliveries, so this WILL be called more than once for the same
// purchase, and re-granting has to be a no-op rather than a crash.
//
// `trx` lets the caller run this inside a transaction so the purchase row and
// the access rows commit together — a purchase that granted nothing is worse
// than no purchase at all.
export async function addUserCourseAccess(
    {
        userId,
        courseIds,
    }: {
        userId: string;
        courseIds: string[];
    },
    trx: Omit<typeof db, "$client"> = db
) {
    if (courseIds.length === 0) return [];

    const accesses = await trx
        .insert(UserCourseAccessTable)
        .values(courseIds.map(courseId => ({ userId, courseId })))
        .onConflictDoNothing()
        .returning();

    accesses.forEach(expireUserCourseAccessCache);

    return accesses;
}

// Removes access after a refund — but only for courses the user has no OTHER
// reason to keep.
//
// The subtlety: a course can be sold inside more than one product. If someone
// bought two bundles sharing a course and refunds only one, deleting every
// course in the refunded product would strip access they still paid for. So we
// collect the courses covered by their remaining valid purchases first and
// subtract those from the deletion set.
//
// IMPORTANT: the caller must set `refundedAt` on the purchase BEFORE calling
// this. The query below treats any purchase without `refundedAt` as still
// valid, so an unrecorded refund would count itself as a reason to keep the
// very access it is supposed to remove, and nothing would be revoked.
export async function revokeUserCourseAccess(
    {
        userId,
        productId,
    }: {
        userId: string;
        productId: string;
    },
    trx: Omit<typeof db, "$client"> = db
) {
    const [validPurchases, refundedProduct] = await Promise.all([
        trx.query.PurchaseTable.findMany({
            where: and(
                eq(PurchaseTable.userId, userId),
                isNull(PurchaseTable.refundedAt)
            ),
            with: {
                product: {
                    with: { courseProducts: { columns: { courseId: true } } },
                },
            },
        }),
        trx.query.ProductTable.findFirst({
            where: eq(ProductTable.id, productId),
            with: { courseProducts: { columns: { courseId: true } } },
        }),
    ]);

    if (refundedProduct == null) return [];

    const stillOwnedCourseIds = new Set(
        validPurchases.flatMap(purchase =>
            purchase.product.courseProducts.map(cp => cp.courseId)
        )
    );

    const courseIdsToRevoke = refundedProduct.courseProducts
        .map(cp => cp.courseId)
        .filter(courseId => !stillOwnedCourseIds.has(courseId));

    if (courseIdsToRevoke.length === 0) return [];

    const revoked = await trx
        .delete(UserCourseAccessTable)
        .where(
            and(
                eq(UserCourseAccessTable.userId, userId),
                inArray(UserCourseAccessTable.courseId, courseIdsToRevoke)
            )
        )
        .returning();

    revoked.forEach(expireUserCourseAccessCache);

    return revoked;
}
