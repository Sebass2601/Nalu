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

// The two columns that say whether a promotion is running. Everything below is
// typed against the narrowest set it actually reads, so a caller that only
// wants a price to display is not made to fetch an offer code it has no use
// for.
export type PromoFields = {
    promoOfferCode: string | null;
    promoEndsAt: Date | null;
};

export type OfferFields = PromoFields & {
    externalOfferCode: string | null;
};

export type PromoPriceFields = PromoFields & {
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
//
// It is also read LAZILY, on the last line and nowhere earlier, rather than as
// a `now = new Date()` default. A default is evaluated on every call, including
// the ones that return before ever looking at it — and under Cache Components
// asking the time while a page is being prerendered is a build error. Written
// this way a product with no deadline never touches the clock at all, which is
// what lets its price be part of the static page. See `priceDependsOnClock`.
export function isPromoLive(product: PromoFields, now?: Date) {
    if (product.promoOfferCode == null) return false;
    if (product.promoEndsAt == null) return true;

    return product.promoEndsAt.getTime() > (now ?? new Date()).getTime();
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
    now?: Date
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
export function displayPrice(product: PromoPriceFields, now?: Date) {
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

// Whether what `displayPrice` returns can change with the time of day.
//
// Only a promotion that has both a price to show and a date to stop showing it
// on. Everything else gives the same answer at any instant — no promotion, a
// promotion that runs until it is switched off, or one with no price filled in
// — and so can be drawn once and kept, instead of being worked out again for
// every visitor.
//
// The page asks this first and only waits for a request when the answer is yes.
export function priceDependsOnClock(product: PromoPriceFields) {
    return (
        product.promoOfferCode != null &&
        product.promoPriceInDollars != null &&
        product.promoEndsAt != null
    );
}

// Whether a sale is on: at least one promotion that is live AND actually
// cheaper. This is the whole of what the Samhain announcement asks before
// showing itself.
//
// A promo offer priced at or above the base price does not count. It is still
// honoured at checkout and still shown on the product — that is what will be
// charged — but it is not a discount, and neither is one so small it rounds to
// 0%.
//
// What the sale takes off, and the date it runs to, are deliberately not worked
// out here. The announcement states both as fixed copy — see SamhainPopup.
//
// `now` is required, unlike above. This always compares against it, and a
// caller asking about several products has to hold one instant for all of them.
export function hasLiveDiscount(products: PromoPriceFields[], now: Date) {
    return products.some(product => {
        const { priceInDollars, wasPriceInDollars } = displayPrice(product, now);

        if (wasPriceInDollars == null || wasPriceInDollars <= 0) return false;

        const percentOff = Math.round(
            (1 - priceInDollars / wasPriceInDollars) * 100
        );

        return percentOff >= 1;
    });
}
