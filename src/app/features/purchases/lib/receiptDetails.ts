import "server-only";

import { getHotmartSale } from "@/lib/hotmartApi";

// The half of a receipt that only Hotmart knows.
//
// Everything identifying a sale — product, date, buyer, amount — lives in our
// own `purchases` row, so a receipt page can be drawn without asking anyone.
// What that row does not hold is what Hotmart actually collected and whether a
// coupon moved the price, which is what this fetches.
//
// Much smaller than the Stripe version it replaces. That one expanded the
// session, walked to the latest charge for a hosted receipt URL, computed
// partial-refund amounts, and fetched coupons by ID to name each discount row —
// four round trips of ceremony. Hotmart returns the sale with its price already
// resolved, and issues the buyer's invoice itself as merchant of record, so
// there is no hosted receipt URL to chase.
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

// Deliberately not cached: this runs only when somebody opens one specific
// purchase, and a receipt is worth reading fresh.
export async function getReceiptDetails({
    orderId,
    pricePaidInCents,
    isRefunded,
}: {
    // Nullable because a purchase row could predate the column. Without it
    // there is nothing to ask Hotmart about, so the page renders from local
    // figures alone.
    orderId: string | null;
    pricePaidInCents: number;
    isRefunded: boolean;
}): Promise<{ pricingRows: PricingRow[] }> {
    if (orderId == null) return { pricingRows: localOnlyRows() };

    try {
        const sale = await getHotmartSale(orderId);

        if (sale == null) return { pricingRows: localOnlyRows() };

        // Hotmart reports money in the currency's major unit; everything below
        // works in integer cents, as the rest of this codebase does.
        const collectedInCents = Math.round(
            (sale.purchase.price?.value ?? 0) * 100
        );

        // What Hotmart charged versus what the offer lists is the discount, if
        // any. Hotmart returns the resolved price rather than a breakdown, so
        // this is inferred rather than read — which is why it only produces a
        // row when a coupon code is actually present on the sale.
        const couponCode = sale.purchase.offer?.coupon_code;

        const discountRows: PricingRow[] =
            couponCode != null && collectedInCents < pricePaidInCents
                ? [
                      {
                          label: `Cupón ${couponCode}`,
                          amountInDollars:
                              (pricePaidInCents - collectedInCents) / -100,
                      },
                  ]
                : [];

        const paid = collectedInCents || pricePaidInCents;

        return {
            pricingRows: getPricingRows(discountRows, {
                subtotal: pricePaidInCents,
                total: isRefunded ? 0 : paid,
                refund: isRefunded ? paid : undefined,
            }),
        };
    } catch {
        // Hotmart unreachable, or a sale too old to retrieve. The local receipt
        // is the point of those pages, so they still render in full — just
        // without the breakdown, which we do not hold ourselves.
        return { pricingRows: localOnlyRows() };
    }

    function localOnlyRows() {
        return getPricingRows([], {
            subtotal: pricePaidInCents,
            total: isRefunded ? 0 : pricePaidInCents,
            refund: isRefunded ? pricePaidInCents : undefined,
        });
    }
}

// A plain total when nothing happened to the price, and a subtotal / discount /
// refund / total breakdown when something did. Showing "Subtotal" and "Total"
// as identical lines on an undiscounted purchase would just be noise.
//
// Unchanged from the Stripe version on purpose: this arithmetic is
// provider-agnostic, and it is what keeps the buyer's page and the admin's page
// agreeing.
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
