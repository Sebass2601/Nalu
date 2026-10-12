// Whether there is still something to sell this person in this product.
//
// A product is a way of buying courses, so the honest test for "should we ask
// them for money" is whether paying would get them a course they do not already
// keep. It goes off sale for one person only when buying it would add nothing:
// every course inside it is already theirs for good, by any mix of purchases
// and courses an admin handed them.
//
// Holding PART of a bundle leaves it for sale. That is the change from the rule
// this replaces, which took the button away from anybody an admin had given a
// single course of the bundle — and so left them no way to pay for the rest —
// while still offering a one-course product to somebody who had bought the
// larger bundle containing it.
//
// A subscription is deliberately not an input. It is a rental that lapses, and
// buying is how a subscriber makes a course permanent — see
// `getCourseUpgradeOffer`.
//
// This lives apart from the queries that feed it, for the same reason
// `accessIsRevocable` does: the product page hides the button with it and
// `startCheckout` refuses the request with it, so both are deciding from one
// definition rather than two that can drift.
export function productIsForSale({
    ownsProduct,
    productCourseIds,
    ownedCourseIds,
}: {
    // A purchase of this exact product that has not been refunded.
    ownsProduct: boolean;
    // Every course the product bundles.
    productCourseIds: string[];
    // The courses this person keeps permanently — bought or granted by hand.
    // May include courses from outside the product; those are simply ignored.
    ownedCourseIds: string[];
}): boolean {
    // Bought it, and that is the end of it. Normally the check below would say
    // the same thing, because buying a product grants every course in it. The
    // two part ways when a course is added to a product after the sale: the
    // buyer lacks the new course, and charging them again for a product they
    // already paid for is not how they should come to have it.
    if (ownsProduct) return false;

    // `every` is true of an empty list, which read literally would take a
    // product with no courses off sale for the whole world. Nothing in it can
    // be held, so only buying it removes it.
    if (productCourseIds.length === 0) return true;

    const owned = new Set(ownedCourseIds);

    return !productCourseIds.every(courseId => owned.has(courseId));
}
