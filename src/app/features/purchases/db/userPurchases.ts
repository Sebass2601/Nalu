import "server-only";

import { db } from "@/drizzle/db";
import { CourseProductTable, PurchaseTable } from "@/drizzle/schema";
import { desc, eq, inArray } from "drizzle-orm";
import { cacheTag } from "next/cache";
import { getPurchaseUserTag } from "./cache/purchases";
import { getProductGlobalTag } from "@/app/features/products/db/cache/products";

export type UserPurchase = {
    id: string;
    productName: string;
    productImageUrl: string;
    pricePaidInCents: number;
    purchasedAt: Date;
    refundedAt: Date | null;
    // Set only when the purchased product unlocks exactly one course, so the row
    // can link straight to it. Null when the product bundles several — or none.
    courseId: string | null;
};

// Everything this person has ever paid for, newest first, with enough about each
// to draw its row.
//
// Refunded purchases are INCLUDED, unlike in `userOwnsProduct`. That function
// filters them out because it answers a question about access; this one answers
// a question about history, where a refund is a row to label rather than a row
// to hide.
//
// Nothing here identifies a Stripe object. Every row links to its own receipt
// page, which looks up what it needs from the purchase id server-side.
export async function getUserPurchases(
    userId: string
): Promise<UserPurchase[]> {
    "use cache";
    // Both writes to this table — `insertPurchase` and `refundPurchase` — expire
    // this tag already.
    cacheTag(getPurchaseUserTag(userId));
    // The product-to-course links are edited through the product admin form, so
    // re-linking a product has to move the deep links below.
    cacheTag(getProductGlobalTag());

    const purchases = await db
        .select({
            id: PurchaseTable.id,
            productId: PurchaseTable.productId,
            productDetails: PurchaseTable.productDetails,
            pricePaidInCents: PurchaseTable.pricePaidInCents,
            purchasedAt: PurchaseTable.createdAt,
            refundedAt: PurchaseTable.refundedAt,
        })
        .from(PurchaseTable)
        .where(eq(PurchaseTable.userId, userId))
        .orderBy(desc(PurchaseTable.createdAt));

    if (purchases.length === 0) return [];

    const soleCourseIds = await getSoleCourseIds(
        purchases.map(purchase => purchase.productId)
    );

    return purchases.map(purchase => ({
        id: purchase.id,
        // From the snapshot taken at the moment of sale, never the live product
        // row. That is the whole point of `productDetails`: a receipt has to keep
        // showing what was actually bought after the product is renamed,
        // repriced, or has its image replaced.
        productName: purchase.productDetails.name,
        productImageUrl: purchase.productDetails.imageUrl,
        pricePaidInCents: purchase.pricePaidInCents,
        purchasedAt: purchase.purchasedAt,
        refundedAt: purchase.refundedAt,
        courseId: soleCourseIds.get(purchase.productId) ?? null,
    }));
}

// Maps each product to its course, but only where that is unambiguous.
//
// Products are linked to courses many-to-many, so a bundle has no single course
// to point at. Rather than picking one arbitrarily — which would send someone to
// a course that is not the one they had in mind — those map to null and the row
// falls back to linking at the whole shelf.
async function getSoleCourseIds(productIds: string[]) {
    const rows = await db
        .select({
            productId: CourseProductTable.productId,
            courseId: CourseProductTable.courseId,
        })
        .from(CourseProductTable)
        .where(inArray(CourseProductTable.productId, productIds));

    const byProduct = new Map<string, string | null>();

    for (const row of rows) {
        // Seeing a product twice means it unlocks more than one course, so it
        // stops being deep-linkable and stays that way however many follow.
        byProduct.set(
            row.productId,
            byProduct.has(row.productId) ? null : row.courseId
        );
    }

    return byProduct;
}
