// Which Hotmart offer a product is currently sold through, and at what price.
//
// Hotmart models a promotion as a SECOND offer on the same product rather than
// a discount applied to the first. Running one is therefore a matter of
// pointing the checkout link at a different code — reversible in a click, and
// Hotmart's own reporting stays honest about what each sale actually earned.
//
// Pure functions, no I/O: this is the arithmetic of "which price is live", and
// keeping it separate is what lets the product page and the checkout action
// agree without either calling the other.

export type OfferFields = {
    externalOfferCode: string | null;
    promoOfferCode: string | null;
    promoEndsAt: Date | null;
};

export type PromoPriceFields = OfferFields & {
    priceInDollars: number;
    promoPriceInDollars: number | null;
};

// A promo is live when it has a code AND has not expired.
//
// `promoEndsAt` of null means "until I turn it off" — an open-ended sale, which
// is the common case for a launch discount.
//
// Expiry is evaluated at read time rather than by a scheduled job that flips a
// flag. That matters: a job is one more thing to deploy, monitor and forget,
// and if it fails the site keeps selling at the promotional price with nobody
// noticing. Comparing dates on read cannot fail that way.
//
// `now` is injectable so the behaviour at the boundary is testable without
// waiting for real time to pass.
export function isPromoLive(product: OfferFields, now: Date = new Date()) {
    if (product.promoOfferCode == null) return false;
    if (product.promoEndsAt == null) return true;

    return product.promoEndsAt.getTime() > now.getTime();
}

// The offer code checkout should use, or null when the product has no usable
// offer at all.
//
// Null is a real answer, not an error: a product can be drafted here before it
// exists in Hotmart, because there is no API to create one. The caller decides
// what to do about it — the admin list shows a warning, the checkout action
// refuses.
export function activeOfferCode(
    product: OfferFields,
    now: Date = new Date()
): string | null {
    if (isPromoLive(product, now)) return product.promoOfferCode;

    return product.externalOfferCode;
}

// What to display, and what it was before, so a page can strike through the
// original. `wasPriceInDollars` is null when nothing is discounted, which is
// the signal to render a single price rather than a comparison.
//
// Display only. Hotmart charges whatever its offer says and nothing in this
// codebase ever sends an amount — see the spec's "Known drift" note on why the
// two numbers cannot be verified against each other.
export function displayPrice(product: PromoPriceFields, now: Date = new Date()) {
    if (isPromoLive(product, now) && product.promoPriceInDollars != null) {
        return {
            priceInDollars: product.promoPriceInDollars,
            wasPriceInDollars: product.priceInDollars,
        };
    }

    return {
        priceInDollars: product.priceInDollars,
        wasPriceInDollars: null,
    };
}
