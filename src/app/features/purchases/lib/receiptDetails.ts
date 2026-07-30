import "server-only";

import type Stripe from "stripe";
import { stripe } from "@/lib/stripe";

// The half of a receipt that only Stripe knows.
//
// Everything identifying a sale — product, date, buyer, amount — lives in our
// own `purchases` row, so a receipt page can be drawn without asking anyone.
// Two things are missing from that row: the URL of Stripe's hosted receipt, and
// how the final price was reached, which for this site usually means a regional
// discount. Both are fetched here.
//
// Shared by the buyer's receipt at /purchases/[purchaseId] and the admin's at
// /admin/purchases/[purchaseId]. The two pages look nothing alike, but the
// numbers on them have to agree, and one copy of this arithmetic is how that
// stays true.

export type PricingRow = {
    label: string;
    amountInDollars: number;
    isBold?: boolean;
};

// Deliberately not cached: a receipt URL is worth fetching fresh, and this runs
// only when somebody opens one specific purchase.
export async function getReceiptDetails({
    stripeSessionId,
    pricePaidInCents,
    isRefunded,
}: {
    stripeSessionId: string;
    pricePaidInCents: number;
    isRefunded: boolean;
}): Promise<{ receiptUrl?: string; pricingRows: PricingRow[] }> {
    try {
        const { payment_intent, total_details, amount_total, amount_subtotal } =
            await stripe.checkout.sessions.retrieve(stripeSessionId, {
                expand: [
                    "payment_intent.latest_charge",
                    "total_details.breakdown.discounts",
                ],
            });

        const charge = getLatestCharge(payment_intent);

        // Stripe's own figure when the expansion produced a charge, since a
        // partial refund is a number only it knows. Falling back to the full
        // price otherwise, because at that point all we know is the flag on our
        // own row.
        const refundAmount =
            charge?.amount_refunded ??
            (isRefunded ? pricePaidInCents : undefined);

        return {
            receiptUrl: charge?.receipt_url ?? undefined,
            pricingRows: getPricingRows(await getDiscountRows(total_details), {
                total: (amount_total ?? pricePaidInCents) - (refundAmount ?? 0),
                subtotal: amount_subtotal ?? pricePaidInCents,
                refund: refundAmount,
            }),
        };
    } catch {
        // Stripe unreachable, or a session too old to retrieve. The local
        // receipt is the point of those pages, so they still render in full —
        // just without the hosted link and without the discount breakdown,
        // neither of which we hold ourselves.
        return {
            pricingRows: getPricingRows([], {
                total: isRefunded ? 0 : pricePaidInCents,
                subtotal: pricePaidInCents,
                refund: isRefunded ? pricePaidInCents : undefined,
            }),
        };
    }
}

function getLatestCharge(
    paymentIntent: Stripe.PaymentIntent | string | null
): Stripe.Charge | undefined {
    // A bare string means the expansion did not happen, so there is no charge
    // object to read here.
    if (paymentIntent == null || typeof paymentIntent === "string") return;

    const charge = paymentIntent.latest_charge;
    if (charge == null || typeof charge === "string") return;

    return charge;
}

// One row per discount applied to the sale, named after the coupon behind it.
async function getDiscountRows(
    totalDetails: Stripe.Checkout.Session.TotalDetails | null
): Promise<PricingRow[]> {
    const discounts = totalDetails?.breakdown?.discounts ?? [];

    return Promise.all(
        discounts.map(async ({ amount, discount }) => {
            const coupon = await resolveCoupon(discount.source.coupon);

            return {
                // Regional coupons are already named for their own rate — "PPP
                // 30%" — so the name alone reads correctly. The percentage is
                // spelled out only for a coupon that arrived without a name,
                // and the generic word covers one with neither.
                label:
                    coupon?.name ??
                    (coupon?.percent_off != null
                        ? `${coupon.percent_off}% de descuento`
                        : "Descuento"),
                amountInDollars: amount / -100,
            };
        })
    );
}

// The coupon behind a discount arrives as a bare id.
//
// It cannot be expanded in the session call above: the path would be
// `total_details.breakdown.discounts.discount.source.coupon`, well past the four
// levels Stripe allows. So it is fetched separately, and only when a discount
// actually exists.
//
// A failure here costs the row its name, not the row itself — the amount is the
// substantive part of a discount line, and it comes from the session.
async function resolveCoupon(coupon: string | Stripe.Coupon | null) {
    if (coupon == null) return null;
    if (typeof coupon !== "string") return coupon;

    try {
        return await stripe.coupons.retrieve(coupon);
    } catch {
        return null;
    }
}

// A plain total when nothing happened to the price, and a subtotal / discount /
// refund / total breakdown when something did. Showing "Subtotal" and "Total"
// as identical lines on an undiscounted purchase would just be noise.
function getPricingRows(
    discountRows: PricingRow[],
    {
        total,
        subtotal,
        refund,
    }: { total: number; subtotal: number; refund?: number }
): PricingRow[] {
    const adjustments = [...discountRows];

    if (refund) {
        adjustments.push({
            label: "Reembolso",
            amountInDollars: refund / -100,
        });
    }

    if (adjustments.length === 0) {
        return [{ label: "Total", amountInDollars: total / 100, isBold: true }];
    }

    return [
        { label: "Subtotal", amountInDollars: subtotal / 100 },
        ...adjustments,
        { label: "Total", amountInDollars: total / 100, isBold: true },
    ];
}
