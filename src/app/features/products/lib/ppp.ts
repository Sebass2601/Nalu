// Apply a PPP discount fraction (0–1) to a price, returning what Stripe will
// actually charge. Never drops below zero. Pure and side-effect free so it can
// run anywhere (server or client).
//
// Rounds to the CENT, not to the dollar. Stripe stores prices as an integer
// number of cents and applies `percent_off` to that, so rounding to whole
// dollars here made the page quote a different number from the one on the
// invoice: a 25% discount on $10 was advertised as $8 and charged as $7.50.
// Any percentage that is not a clean fraction of the price drifts this way, by
// up to half a dollar in either direction. `formatPrice` prints the cents only
// when they are non-zero, so exact discounts still read as "$6" rather than
// "$6.00".
export function getDiscountedPriceInDollars(
    priceInDollars: number,
    discountPercentage: number
) {
    const cents = Math.round(priceInDollars * 100 * (1 - discountPercentage));
    return Math.max(0, cents) / 100;
}
