import { afterEach, describe, expect, it, vi } from "vitest";
import {
    activeOfferCode,
    displayPrice,
    isPromoLive,
    priceDependsOnClock,
    summarizeLivePromos,
} from "./promoOffer";

const base = {
    externalOfferCode: "base-offer",
    promoOfferCode: null,
    promoEndsAt: null,
};

const NOW = new Date("2026-08-12T12:00:00Z");
const YESTERDAY = new Date("2026-08-11T12:00:00Z");
const TOMORROW = new Date("2026-08-13T12:00:00Z");

describe("isPromoLive", () => {
    it("is false when no promo code is set", () => {
        expect(isPromoLive(base, NOW)).toBe(false);
    });

    // The common case for a launch discount: on until someone turns it off.
    it("is true for a promo with no end date", () => {
        expect(isPromoLive({ ...base, promoOfferCode: "promo" }, NOW)).toBe(true);
    });

    it("is true while the end date is in the future", () => {
        expect(
            isPromoLive({ ...base, promoOfferCode: "promo", promoEndsAt: TOMORROW }, NOW)
        ).toBe(true);
    });

    it("is false once the end date has passed", () => {
        expect(
            isPromoLive({ ...base, promoOfferCode: "promo", promoEndsAt: YESTERDAY }, NOW)
        ).toBe(false);
    });

    // Exactly at the boundary the promo is over. Picking the stricter side is
    // deliberate: charging someone the old price a moment early is a smaller
    // problem than a sale that will not die.
    it("is false at the exact expiry instant", () => {
        expect(
            isPromoLive({ ...base, promoOfferCode: "promo", promoEndsAt: NOW }, NOW)
        ).toBe(false);
    });
});

describe("activeOfferCode", () => {
    it("uses the base offer when no promo is set", () => {
        expect(activeOfferCode(base, NOW)).toBe("base-offer");
    });

    it("uses the promo offer while it is live", () => {
        expect(
            activeOfferCode({ ...base, promoOfferCode: "promo-offer" }, NOW)
        ).toBe("promo-offer");
    });

    // The point of read-time expiry: the promo lapses on its own, with no
    // scheduled job to fail silently and keep selling at the sale price.
    it("falls back to the base offer once the promo expires", () => {
        expect(
            activeOfferCode(
                { ...base, promoOfferCode: "promo-offer", promoEndsAt: YESTERDAY },
                NOW
            )
        ).toBe("base-offer");
    });

    // A product drafted here before it exists in Hotmart. Not an error — there
    // is no API to create one, so this state is unavoidable and the caller
    // decides what to do about it.
    it("returns null when the product has no offer at all", () => {
        expect(activeOfferCode({ ...base, externalOfferCode: null }, NOW)).toBeNull();
    });
});

describe("displayPrice", () => {
    it("shows one price when nothing is discounted", () => {
        expect(
            displayPrice({ ...base, priceInDollars: 60, promoPriceInDollars: null }, NOW)
        ).toEqual({ priceInDollars: 60, wasPriceInDollars: null });
    });

    it("shows the promo price with the original to strike through", () => {
        expect(
            displayPrice(
                {
                    ...base,
                    promoOfferCode: "promo",
                    priceInDollars: 60,
                    promoPriceInDollars: 39,
                },
                NOW
            )
        ).toEqual({ priceInDollars: 39, wasPriceInDollars: 60 });
    });

    // A promo offer with no price filled in would otherwise advertise the full
    // price struck through against itself.
    it("ignores a live promo that carries no price", () => {
        expect(
            displayPrice(
                {
                    ...base,
                    promoOfferCode: "promo",
                    priceInDollars: 60,
                    promoPriceInDollars: null,
                },
                NOW
            )
        ).toEqual({ priceInDollars: 60, wasPriceInDollars: null });
    });

    it("reverts to the full price once the promo expires", () => {
        expect(
            displayPrice(
                {
                    ...base,
                    promoOfferCode: "promo",
                    promoEndsAt: YESTERDAY,
                    priceInDollars: 60,
                    promoPriceInDollars: 39,
                },
                NOW
            )
        ).toEqual({ priceInDollars: 60, wasPriceInDollars: null });
    });
});

// A page that can be drawn without knowing the time is one Next can prerender.
// Under Cache Components a bare `new Date()` during a prerender is a build
// error, so "does this price need the clock" has to be answerable first, and
// the answer has to be honoured: no deadline, no clock.
describe("priceDependsOnClock", () => {
    const priced = { ...base, priceInDollars: 60, promoPriceInDollars: 39 };

    it("is false with no promo at all", () => {
        expect(priceDependsOnClock({ ...priced, promoPriceInDollars: null })).toBe(false);
    });

    it("is false for a promo that runs until it is switched off", () => {
        expect(priceDependsOnClock({ ...priced, promoOfferCode: "promo" })).toBe(false);
    });

    it("is true for a promo with an end date", () => {
        expect(
            priceDependsOnClock({ ...priced, promoOfferCode: "promo", promoEndsAt: TOMORROW })
        ).toBe(true);
    });

    // An end date on a promo that shows no price changes nothing on screen
    // whichever side of it we are on, so it is not worth waiting for a request.
    it("is false when the promo carries no price to show", () => {
        expect(
            priceDependsOnClock({
                ...priced,
                promoOfferCode: "promo",
                promoPriceInDollars: null,
                promoEndsAt: TOMORROW,
            })
        ).toBe(false);
    });
});

describe("reading the clock", () => {
    afterEach(() => vi.unstubAllGlobals());

    // Stands in for the prerender: any attempt to ask what time it is throws.
    function forbidTheClock() {
        const RealDate = Date;
        vi.stubGlobal(
            "Date",
            class extends RealDate {
                constructor(...args: ConstructorParameters<typeof RealDate> | []) {
                    if (args.length === 0) throw new Error("the clock was read");
                    super(...(args as ConstructorParameters<typeof RealDate>));
                }
            }
        );
    }

    it("is never done for a product with no deadline", () => {
        forbidTheClock();

        expect(
            displayPrice({ ...base, priceInDollars: 60, promoPriceInDollars: null })
        ).toEqual({ priceInDollars: 60, wasPriceInDollars: null });

        expect(
            displayPrice({
                ...base,
                promoOfferCode: "promo",
                priceInDollars: 60,
                promoPriceInDollars: 39,
            })
        ).toEqual({ priceInDollars: 39, wasPriceInDollars: 60 });
    });
});

describe("summarizeLivePromos", () => {
    const product = (
        priceInDollars: number,
        promoPriceInDollars: number | null,
        promoEndsAt: Date | null = null
    ) => ({
        promoOfferCode: promoPriceInDollars == null ? null : "promo",
        promoEndsAt,
        priceInDollars,
        promoPriceInDollars,
    });

    it("is null when nothing is on promotion", () => {
        expect(summarizeLivePromos([product(60, null), product(80, null)], NOW)).toBeNull();
    });

    it("is null for an empty catalogue", () => {
        expect(summarizeLivePromos([], NOW)).toBeNull();
    });

    it("reports a single reduction as one figure", () => {
        expect(summarizeLivePromos([product(100, 70), product(80, null)], NOW)).toEqual({
            minPercentOff: 30,
            maxPercentOff: 30,
            endsAt: null,
        });
    });

    it("reports the range across several reductions", () => {
        expect(
            summarizeLivePromos([product(100, 70), product(200, 100), product(60, 54)], NOW)
        ).toEqual({ minPercentOff: 10, maxPercentOff: 50, endsAt: null });
    });

    // Announcing a sale that ended yesterday is the worst thing this could do.
    it("ignores promotions that have expired", () => {
        expect(
            summarizeLivePromos([product(100, 50, YESTERDAY), product(100, 80, TOMORROW)], NOW)
        ).toEqual({ minPercentOff: 20, maxPercentOff: 20, endsAt: TOMORROW });
    });

    it("is null when every promotion has expired", () => {
        expect(summarizeLivePromos([product(100, 50, YESTERDAY)], NOW)).toBeNull();
    });

    // A promo offer priced at or above the base price is a different offer, not
    // a discount, and there is nothing to announce about it.
    it("ignores a promo price that is not lower", () => {
        expect(summarizeLivePromos([product(100, 100), product(100, 120)], NOW)).toBeNull();
    });

    // 201 -> 200 is under half a percent. "0% de descuento" is not a sale.
    it("ignores a reduction that rounds to nothing", () => {
        expect(summarizeLivePromos([product(201, 200)], NOW)).toBeNull();
    });

    it("gives the earliest deadline when every promotion has one", () => {
        const later = new Date("2026-08-20T12:00:00Z");

        expect(
            summarizeLivePromos([product(100, 70, later), product(100, 70, TOMORROW)], NOW)?.endsAt
        ).toEqual(TOMORROW);
    });

    // "Hasta el 13" would be false for the one that carries on past it — and
    // true of nothing in particular for the one with no end at all.
    it("gives no deadline when any promotion is open-ended", () => {
        expect(
            summarizeLivePromos([product(100, 70, TOMORROW), product(100, 70)], NOW)?.endsAt
        ).toBeNull();
    });
});
