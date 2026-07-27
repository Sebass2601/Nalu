import "server-only";

import Stripe from "stripe";
import { stripe } from "@/lib/stripe";

// A PPP discount has to exist in two places at once: in our database, where an
// admin edits it, and in Stripe, which is what actually reduces the amount the
// buyer is charged. Stripe expresses "N% off" as a Coupon object, and a Coupon
// is effectively immutable once created — only `name` and `metadata` can be
// changed afterwards, never `percent_off`.
//
// The reference implementation handles that by hardcoding four discount tiers
// and pre-creating four coupons by hand, one per tier, each stored in its own
// environment variable. That approach cannot work here, because this project
// lets an admin type any percentage into the country-group form at runtime: the
// moment someone changes 45% to 42%, there is no coupon to point at and no
// deploy in which to create one.
//
// So instead of naming coupons after tiers, we derive the ID from the
// percentage itself — 45% is always the coupon `ppp-45`. Making the ID a pure
// function of the discount turns "create a coupon" into "make sure the coupon
// for this percentage exists", which is safe to repeat, needs no bookkeeping,
// and tops out at 99 coupons that are each created exactly once.

export function pppCouponIdFor(percentOff: number) {
    return `ppp-${percentOff}`;
}

// Converts the 0–1 fraction stored in the database into the whole-number
// percentage Stripe wants, or null when no coupon should be attached at all.
//
// Rounding to a whole number keeps coupon IDs stable and matches what buyers
// already see: ProductPrice renders `Math.round(discountPercentage * 100)`, so
// a stored 0.427 has always been displayed as "43% off" and will now be charged
// as exactly that.
export function toPercentOff(discountFraction: number | null | undefined) {
    if (discountFraction == null) return null;

    const percentOff = Math.round(discountFraction * 100);

    // Stripe rejects a 0% coupon, and a 100% one would give the catalogue away
    // for free. Both cases mean "charge the normal price, attach nothing".
    if (percentOff <= 0 || percentOff >= 100) return null;

    return percentOff;
}

// Returns the Stripe coupon ID representing this discount, creating the coupon
// the first time that percentage is ever used. Returns null when the discount
// is absent or out of range, which callers should read as "no coupon".
export async function ensurePppCoupon(discountFraction: number | null) {
    const percentOff = toPercentOff(discountFraction);
    if (percentOff == null) return null;

    const couponId = pppCouponIdFor(percentOff);

    try {
        const existing = await stripe.coupons.retrieve(couponId);
        return existing.id;
    } catch (error) {
        // "This coupon does not exist yet" is the expected path on first use.
        // Anything else — a bad API key, a Stripe outage — is a real failure and
        // must not be swallowed into a silently missing discount.
        if (!isStripeErrorCode(error, "resource_missing")) throw error;
    }

    try {
        return (
            await stripe.coupons.create({
                id: couponId,
                percent_off: percentOff,
                // Without this, `duration` defaults to "once", which discounts
                // only the FIRST invoice of a subscription and then quietly
                // charges full price on every renewal.
                duration: "forever",
                name: `PPP ${percentOff}%`,
            })
        ).id;
    } catch (error) {
        // Two admins saving at the same moment both see "missing" and both try
        // to create. Whoever loses that race gets this error — and the coupon it
        // was trying to make now exists, which is the outcome it wanted.
        if (isStripeErrorCode(error, "resource_already_exists")) return couponId;
        throw error;
    }
}

function isStripeErrorCode(error: unknown, code: string) {
    return error instanceof Stripe.errors.StripeError && error.code === code;
}
