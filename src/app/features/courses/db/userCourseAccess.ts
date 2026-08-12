import { db } from "@/drizzle/db";
import {
    ProductTable,
    PurchaseTable,
    UserCourseAccessTable,
} from "@/drizzle/schema";
import { and, eq, inArray, isNotNull, isNull } from "drizzle-orm";
import { expireUserCourseAccessCache } from "./cache/userCourseAccess";

// Grants permanent access to a set of courses. This is what a completed
// one-time purchase writes. Subscription access is never written here — it is
// computed live from `courses.includedInSubscription`, so it disappears on its
// own when a subscription lapses, and cannot accidentally delete access someone
// bought outright.
//
// The conflict clause is what makes this safe to run twice. Stripe retries
// webhook deliveries, so this WILL be called more than once for the same
// purchase, and re-granting has to be a no-op rather than a crash.
//
// It clears `grantedBy` rather than doing nothing, which matters in exactly one
// situation: an admin granted the course by hand and the same person then
// bought it. Doing nothing would leave the row still labelled a manual grant,
// and the admin screen would happily revoke access somebody has now paid for.
// Writing NULL promotes the row to purchased, where nothing but a refund can
// take it away. Re-running still settles on the same NULL, so idempotency is
// untouched.
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
        .onConflictDoUpdate({
            target: [
                UserCourseAccessTable.userId,
                UserCourseAccessTable.courseId,
            ],
            set: { grantedBy: null },
        })
        .returning();

    accesses.forEach(expireUserCourseAccessCache);

    return accesses;
}

// Hands one course to one account without any purchase behind it, recording
// which admin did it.
//
// `onConflictDoNothing` covers the double-click and the stale list: if the row
// already exists it is left exactly as it is. That matters most when the
// existing row is a purchase — this must never overwrite a buyer's NULL with an
// admin id and thereby make paid access revocable.
//
// An empty return therefore means "they already had it", not "it failed".
export async function grantCourseAccess({
    userId,
    courseId,
    grantedBy,
}: {
    userId: string;
    courseId: string;
    grantedBy: string;
}) {
    return db
        .insert(UserCourseAccessTable)
        .values({ userId, courseId, grantedBy })
        .onConflictDoNothing()
        .returning();
}

// Takes back a manual grant.
//
// `isNotNull(grantedBy)` is the rule that protects buyers, and it lives in the
// WHERE clause on purpose. Checking first and deleting second would leave a
// window in which the row becomes a purchase between the two statements; as one
// statement, a row that is not a manual grant simply matches nothing.
//
// So an empty return means the row was purchased, or was already gone. Both are
// "there is nothing here for you to remove", which is what the caller reports.
export async function revokeManualCourseAccess({
    userId,
    courseId,
}: {
    userId: string;
    courseId: string;
}) {
    return db
        .delete(UserCourseAccessTable)
        .where(
            and(
                eq(UserCourseAccessTable.userId, userId),
                eq(UserCourseAccessTable.courseId, courseId),
                isNotNull(UserCourseAccessTable.grantedBy)
            )
        )
        .returning();
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
