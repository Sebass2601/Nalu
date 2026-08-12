import { describe, expect, it } from "vitest";
import { activeOfferCode, displayPrice, isPromoLive } from "./promoOffer";

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
