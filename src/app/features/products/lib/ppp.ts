// Apply a PPP discount fraction (0–1) to a whole-dollar price. Rounds to a
// whole dollar and never drops below zero. Pure and side-effect free so it can
// run anywhere (server or client).
export function getDiscountedPriceInDollars(
    priceInDollars: number,
    discountPercentage: number
) {
    return Math.max(0, Math.round(priceInDollars * (1 - discountPercentage)));
}
