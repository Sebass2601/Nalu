import "server-only";

import { db } from "@/drizzle/db";
import { PurchaseTable } from "@/drizzle/schema";
import { desc, eq } from "drizzle-orm";
import { cacheTag } from "next/cache";
import { getPurchaseGlobalTag } from "./cache/purchases";
import { getUserGlobalTag } from "@/app/features/users/db/cache/users";

// The shop's side of the same records `userPurchases` serves to a buyer.
//
// Two things separate these queries from that one. There is no `userId` filter,
// because the whole point is to see everyone's sales in one list; and the buyer
// is joined in, because on this side "who paid" is the column that turns a row
// of numbers into a sale you can act on.
//
// Both are tagged with the users tag as well as the purchases one: the buyer's
// name is copied into these results, so renaming an account has to move it here
// too. Only the purchase itself is snapshotted at the moment of sale — a person
// is a live record, and the admin needs the name that reaches them today.

export type AdminPurchase = {
    id: string;
    productName: string;
    productImageUrl: string;
    pricePaidInCents: number;
    purchasedAt: Date;
    refundedAt: Date | null;
    customerName: string;
};

// Every one-time purchase ever recorded, newest first.
//
// Refunded rows are included and labelled rather than hidden: a refund is part
// of the sales history, and an admin looking for one needs to find it.
//
// Subscription payments are deliberately absent, exactly as they are from the
// buyer's own list. Those invoices live in Hotmart and are not mirrored into this
// table, so a second copy of billing history can never disagree with the one
// Hotmart considers true.
export async function getAllPurchases(): Promise<AdminPurchase[]> {
    "use cache";
    cacheTag(getPurchaseGlobalTag(), getUserGlobalTag());

    const purchases = await db.query.PurchaseTable.findMany({
        columns: {
            id: true,
            pricePaidInCents: true,
            productDetails: true,
            refundedAt: true,
            createdAt: true,
        },
        orderBy: desc(PurchaseTable.createdAt),
        with: { user: { columns: { name: true } } },
    });

    return purchases.map(purchase => ({
        id: purchase.id,
        // From the snapshot taken at the moment of sale, never the live product
        // row — the same rule the buyer's receipt follows, so the two views of
        // one sale keep agreeing after the product is renamed or repriced.
        productName: purchase.productDetails.name,
        productImageUrl: purchase.productDetails.imageUrl,
        pricePaidInCents: purchase.pricePaidInCents,
        purchasedAt: purchase.createdAt,
        refundedAt: purchase.refundedAt,
        customerName: purchase.user.name,
    }));
}

// One purchase, looked up by id alone.
//
// The buyer's version of this query filters on id AND userId together, because
// there the pairing is what stops one customer reading another's receipt. Here
// the id stands on its own, and the gate is upstream instead: every page that
// calls this sits under /admin and runs `requireAdmin` first.
export async function getAdminPurchase(id: string) {
    "use cache";
    cacheTag(getPurchaseGlobalTag(), getUserGlobalTag());

    return db.query.PurchaseTable.findFirst({
        columns: {
            id: true,
            pricePaidInCents: true,
            productDetails: true,
            refundedAt: true,
            createdAt: true,
            orderId: true,
        },
        where: eq(PurchaseTable.id, id),
        with: { user: { columns: { name: true, email: true } } },
    });
}
