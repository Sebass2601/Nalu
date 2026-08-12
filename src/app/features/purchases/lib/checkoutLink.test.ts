import { describe, expect, it } from "vitest";
import { buildCheckoutUrl } from "./checkoutLink";

const fields = {
    checkoutCode: "W12345678X",
    offerCode: "a1b2c3d4",
    email: "ana@example.com",
    name: "Ana Pérez",
    userId: "11111111-2222-3333-4444-555555555555",
};

describe("buildCheckoutUrl", () => {
    it("points at the hotlink and carries the offer", () => {
        const url = new URL(buildCheckoutUrl(fields));

        expect(url.origin + url.pathname).toBe(
            "https://pay.hotmart.com/W12345678X"
        );
        expect(url.searchParams.get("off")).toBe("a1b2c3d4");
    });

    it("prefills the buyer so fewer purchases arrive under an unknown address", () => {
        const url = new URL(buildCheckoutUrl(fields));

        expect(url.searchParams.get("email")).toBe("ana@example.com");
        expect(url.searchParams.get("name")).toBe("Ana Pérez");
    });

    // sck is the only custom data channel Hotmart offers — there is no metadata
    // field — and it returns as purchase.origin.sck. Without it the webhook has
    // nothing but the email to match a payment to an account.
    it("carries the user id in sck", () => {
        const url = new URL(buildCheckoutUrl(fields));

        expect(url.searchParams.get("sck")).toBe(fields.userId);
    });

    it("escapes accents and spaces in the name", () => {
        const url = buildCheckoutUrl({ ...fields, name: "José Ñandú" });

        expect(url).toContain("Jos%C3%A9");
        expect(url).not.toContain(" ");
    });

    // Accounts created through Google may have no name stored.
    it("omits the name entirely when there is none", () => {
        const url = new URL(buildCheckoutUrl({ ...fields, name: null }));

        expect(url.searchParams.has("name")).toBe(false);
    });

    // Nothing in this codebase ever sends an amount: Hotmart owns the price.
    // If a price parameter ever appeared here it would be a bug worth failing.
    it("never sends an amount", () => {
        const url = buildCheckoutUrl(fields);

        expect(url).not.toMatch(/price|amount|value/i);
    });
});
