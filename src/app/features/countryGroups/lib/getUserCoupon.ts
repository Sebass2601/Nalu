import "server-only";

import { getUserCountry } from "@/lib/getUserCountry";
import { getUserPPPDiscount } from "../db/countryGroups";
import { toPercentOff } from "./pppCoupons";

// The request-time question every price and every checkout needs answered:
// what discount does the person currently browsing get, and which Stripe coupon
// encodes it? Returns null when they get no discount.
//
// This deliberately lives apart from ./pppCoupons.ts. That module provisions
// coupons and is imported by the database layer; if the same file also read
// from the database, the two would import each other in a cycle.
//
// Reads the country header that proxy.ts stamps from Arcjet geolocation, so any
// component calling this is dynamic and belongs inside a <Suspense> boundary —
// the same rule ProductPrice already follows.
export async function getUserCoupon() {
    const country = await getUserCountry();
    if (country == null) return null;

    const discount = await getUserPPPDiscount(country);

    // A group can carry a discount with no coupon yet (seeded rows start that
    // way). Treating that as "no discount" is the safe direction to fail: the
    // buyer is charged the full advertised price rather than being shown a
    // discount that checkout then refuses to honour.
    if (discount?.stripeCouponId == null) return null;

    // The coupon applies a whole-number percentage, so the fraction returned
    // here is normalised to match it exactly rather than passing back the raw
    // stored value. A group set to 0.427 is charged 43% off by coupon `ppp-43`,
    // and this returns 0.43 — so the price shown on the page and the price on
    // the Stripe invoice are computed from the same number and cannot drift.
    const percentOff = toPercentOff(discount.discountPercentage);
    if (percentOff == null) return null;

    return {
        stripeCouponId: discount.stripeCouponId,
        discountPercentage: percentOff / 100,
        countryGroupName: discount.countryGroupName,
    };
}
