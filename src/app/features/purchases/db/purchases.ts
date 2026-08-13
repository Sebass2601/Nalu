import { db } from "@/drizzle/db";
import { PurchaseTable } from "@/drizzle/schema";
import { and, eq, isNull } from "drizzle-orm";
import { cacheTag } from "next/cache";
import { expirePurchaseCache, getPurchaseUserTag } from "./cache/purchases";

// Has this person already bought this product and kept it? A refunded purchase
// (`refundedAt` set) no longer grants anything, so it reads as "not owned" and
// the product becomes buyable again.
//
// Caching a per-user answer is safe here because `userId` is an argument, so it
// forms part of the cache key — one entry per user, never shared between them.
export async function userOwnsProduct({
    userId,
    productId,
}: {
    userId: string;
    productId: string;
}) {
    "use cache";
    cacheTag(getPurchaseUserTag(userId));

    const existingPurchase = await db.query.PurchaseTable.findFirst({
        columns: { id: true },
        where: and(
            eq(PurchaseTable.userId, userId),
            eq(PurchaseTable.productId, productId),
            isNull(PurchaseTable.refundedAt)
        ),
    });

    return existingPurchase != null;
}

// Records a completed payment.
//
// `onConflictDoNothing` on `orderId` is the whole idempotency story.
// Hotmart retries webhooks, and PURCHASE_APPROVED and PURCHASE_COMPLETE both
// drive this same code for one payment — so it genuinely runs more than once,
// sometimes concurrently. The unique constraint on `orderId` makes the second
// write a no-op at the database level, which is the only place a race can be
// settled reliably.
//
// `productDetails` copies the product's name, description and image at the
// moment of sale rather than pointing at the live row. A receipt has to keep
// showing what was actually bought even after the product is renamed,
// repriced, or its image replaced.
export async function insertPurchase(
    data: typeof PurchaseTable.$inferInsert,
    trx: Omit<typeof db, "$client"> = db
) {
    const [newPurchase] = await trx
        .insert(PurchaseTable)
        .values(data)
        .onConflictDoNothing({ target: PurchaseTable.orderId })
        .returning();

    // Undefined when the conflict clause skipped the insert, i.e. this exact
    // transaction was already recorded. That is success, not failure.
    if (newPurchase != null) expirePurchaseCache(newPurchase.userId);

    return newPurchase;
}

// Marks a purchase refunded and returns it, or undefined if it was already
// refunded or never existed. Callers use the return value to decide whether to
// revoke course access, so the `isNull` guard doubles as idempotency: a second
// refund webhook matches nothing and revokes nothing.
export async function refundPurchase(
    orderId: string,
    trx: Omit<typeof db, "$client"> = db
) {
    const [refunded] = await trx
        .update(PurchaseTable)
        .set({ refundedAt: new Date() })
        .where(
            and(
                eq(PurchaseTable.orderId, orderId),
                isNull(PurchaseTable.refundedAt)
            )
        )
        .returning();

    if (refunded != null) expirePurchaseCache(refunded.userId);

    return refunded;
}
