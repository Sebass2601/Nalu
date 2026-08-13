import { eq } from "drizzle-orm";
import { db } from "@/drizzle/db";
import { ProductTable, UserTable } from "@/drizzle/schema";
import {
    insertPurchase,
    refundPurchase,
} from "@/app/features/purchases/db/purchases";
import {
    addUserCourseAccess,
    revokeUserCourseAccess,
} from "@/app/features/courses/db/userCourseAccess";
import { alreadyProcessed } from "@/lib/webhookDedupe";
import { getHotmartSale } from "@/lib/hotmartApi";

// Where a Hotmart payment turns into course access.
//
// Split out of route.ts so every rule below can be tested without constructing
// an HTTP request: this is the part with the actual risk in it, and it is also
// the part that cannot be exercised against Hotmart until a product is approved.
//
// The structure is inherited from the Stripe integration deliberately — none of
// it was Stripe-specific and it was the best part of that code:
//
//   * the purchase row and the access grant are written in ONE transaction, so
//     a receipt can never exist without the access it paid for
//   * every handler is idempotent, because retries mean they genuinely run more
//     than once per payment
//   * `refundedAt` is stamped BEFORE access is revoked, because the revocation
//     reads that flag to decide what the buyer still has a right to
//   * `productDetails` is frozen at the moment of sale, so a receipt survives
//     the product being renamed

// The slice of a Hotmart 2.0.0 webhook this app actually reads.
export type HotmartEvent = {
    id: string;
    event: string;
    data: {
        product?: { id?: number | string; name?: string };
        buyer?: { email?: string; name?: string };
        purchase?: {
            transaction?: string;
            status?: string;
            origin?: { sck?: string };
            price?: { value?: number; currency_value?: string };
            checkout_country?: { iso?: string };
        };
        subscription?: {
            status?: string;
            subscriber?: { code?: string };
            plan?: { id?: number | string; name?: string };
        };
    };
};

// Resolves the Nalu account behind a payment.
//
// Two channels, in order of trustworthiness:
//
//   sck — the user ID we put in the checkout link ourselves. Hotmart returns it
//     untouched as `purchase.origin.sck`. Present on every purchase that came
//     through our own button.
//   email — the fallback. A buyer can edit the prefilled address on Hotmart's
//     page, and a marketplace or affiliate sale never passes through our link
//     at all, so `sck` is absent for those.
//
// Throwing when neither resolves is deliberate. The alternative — swallowing it
// — means a real payment lands with no account attached and nobody finds out
// until the customer complains. A throw becomes a 500, which makes Hotmart
// retry and puts the failure in the logs where it can be acted on.
async function resolveUserId(event: HotmartEvent): Promise<string> {
    const sck = event.data.purchase?.origin?.sck;

    if (sck != null && sck.length > 0) {
        const bySck = await db.query.UserTable.findFirst({
            columns: { id: true },
            where: eq(UserTable.id, sck),
        });

        if (bySck != null) return bySck.id;
    }

    const email = event.data.buyer?.email;

    if (email != null && email.length > 0) {
        const byEmail = await db.query.UserTable.findFirst({
            columns: { id: true },
            where: eq(UserTable.email, email),
        });

        if (byEmail != null) return byEmail.id;
    }

    throw new Error(
        `No Nalu account for Hotmart event ${event.id} (sck=${sck ?? "none"}, email=${email ?? "none"})`
    );
}

// Resolves the local product from Hotmart's 7-digit product ID.
//
// Always by product ID, never by offer code: a product can be sold through
// several offers — the base one and any promotion — and they must all land on
// the same product here.
async function resolveProduct(event: HotmartEvent) {
    const externalProductId = event.data.product?.id;

    if (externalProductId == null) {
        throw new Error(`Hotmart event ${event.id} carries no product id`);
    }

    const product = await db.query.ProductTable.findFirst({
        columns: { id: true, name: true, description: true, imageUrl: true },
        where: eq(ProductTable.externalProductId, String(externalProductId)),
        with: { courseProducts: { columns: { courseId: true } } },
    });

    if (product == null) {
        throw new Error(
            `No local product for Hotmart product ${externalProductId} (event ${event.id})`
        );
    }

    return product;
}

// Grants access for an approved or completed purchase.
//
// Both PURCHASE_APPROVED and PURCHASE_COMPLETE route here. The second fires
// when the refund window closes and re-running is harmless, which makes it a
// free safety net for a first delivery that never arrived.
export async function handlePurchaseApproved(event: HotmartEvent) {
    const transaction = event.data.purchase?.transaction;

    if (transaction == null) {
        throw new Error(`Hotmart event ${event.id} carries no transaction code`);
    }

    // Re-verify against the API before granting anything.
    //
    // This is what buys back most of what Hotmart's missing request signature
    // costs. The hottok is a static string with no timestamp and no binding to
    // the body, so anyone who learns it can post a convincing PURCHASE_APPROVED
    // for a sale that never happened. Asking Hotmart directly whether this
    // transaction exists, and is really approved, makes a forged event worthless
    // — at the price of one API call per purchase.
    const sale = await getHotmartSale(transaction);

    if (sale == null) {
        throw new Error(
            `Hotmart does not know transaction ${transaction} from event ${event.id}`
        );
    }

    const confirmedStatus = sale.purchase.status;

    if (confirmedStatus !== "APPROVED" && confirmedStatus !== "COMPLETE") {
        throw new Error(
            `Transaction ${transaction} is ${confirmedStatus}, refusing to grant access`
        );
    }

    const [userId, product] = await Promise.all([
        resolveUserId(event),
        resolveProduct(event),
    ]);

    const courseIds = product.courseProducts.map(cp => cp.courseId);

    // What Hotmart actually collected, after any coupon — not the list price.
    // This is the number that has to reconcile against a Hotmart payout.
    const paidValue =
        sale.purchase.price?.value ?? event.data.purchase?.price?.value ?? 0;

    await db.transaction(async trx => {
        // Inside the transaction so the marker rolls back with the work: see
        // the comment on `alreadyProcessed`. A duplicate delivery returns here
        // having changed nothing.
        if (await alreadyProcessed(trx, event.id, event.event)) return;

        await insertPurchase(
            {
                userId,
                productId: product.id,
                // Hotmart reports money in the currency's major unit, and this
                // column is integer cents. Rounding rather than truncating:
                // 33.30 * 100 is 3329.9999... in binary floating point.
                pricePaidInCents: Math.round(paidValue * 100),
                // Frozen copy: a receipt must keep showing what was bought even
                // after the product is renamed, repriced or its image swapped.
                productDetails: {
                    name: product.name,
                    description: product.description,
                    imageUrl: product.imageUrl,
                },
                orderId: transaction,
                buyerCountry: event.data.purchase?.checkout_country?.iso ?? null,
            },
            trx
        );

        // Runs even when the purchase row already existed. Re-granting is a
        // no-op, and it self-heals the case where an earlier attempt wrote the
        // purchase and then died before granting access.
        await addUserCourseAccess({ userId, courseIds }, trx);
    });

    return product.id;
}

// Reverses a purchase on refund or chargeback.
//
// A chargeback is not a refund — the money is clawed back by the buyer's bank
// rather than returned by us — but the consequence for access is identical, so
// both land here.
export async function handlePurchaseRefunded(event: HotmartEvent) {
    const transaction = event.data.purchase?.transaction;

    if (transaction == null) {
        throw new Error(`Hotmart event ${event.id} carries no transaction code`);
    }

    await db.transaction(async trx => {
        if (await alreadyProcessed(trx, event.id, event.event)) return;

        // Order matters. `refundPurchase` stamps `refundedAt` first so that
        // `revokeUserCourseAccess` no longer counts this purchase as a reason
        // to keep the courses it paid for. Reversed, nothing would be revoked.
        const refunded = await refundPurchase(transaction, trx);

        // Undefined means already refunded or unknown — either way there is
        // nothing left to take away, so a redelivered event does no harm.
        if (refunded == null) return;

        await revokeUserCourseAccess(
            { userId: refunded.userId, productId: refunded.productId },
            trx
        );
    });
}

// Events that reach us but require nothing.
//
// Logged rather than ignored silently: when a buyer says "I paid and got
// nothing", the first question is what Hotmart actually sent, and an empty log
// makes that unanswerable. None of these ever granted access, so there is
// nothing to undo.
export function handleInformationalEvent(event: HotmartEvent) {
    console.info(
        `[hotmart] ${event.event} for transaction ${event.data.purchase?.transaction ?? "unknown"} — no action`
    );
}
