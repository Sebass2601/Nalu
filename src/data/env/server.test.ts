import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Guards the pairing between SUBSCRIPTIONS_ENABLED and the eight
// HOTMART_ALL_ACCESS_* variables.
//
// This is the check that lets subscriptions ship built-but-disabled without the
// usual cost of a feature flag. Marking those eight merely optional would allow
// a half-configured state that boots happily and then fails at a customer's
// checkout — the exact failure the env schema exists to prevent. So the rule is
// worth a test: it is easy to delete by accident while tidying, and nothing
// else would notice until someone enabled subscriptions for real.

const REQUIRED_WHEN_ENABLED = {
    HOTMART_ALL_ACCESS_MONTHLY_PRODUCT_ID: "1234567",
    HOTMART_ALL_ACCESS_MONTHLY_CHECKOUT_CODE: "W12345678X",
    HOTMART_ALL_ACCESS_MONTHLY_OFFER_CODE: "monthly-offer",
    HOTMART_ALL_ACCESS_MONTHLY_PRICE: "29",
    HOTMART_ALL_ACCESS_YEARLY_PRODUCT_ID: "7654321",
    HOTMART_ALL_ACCESS_YEARLY_CHECKOUT_CODE: "Y87654321Z",
    HOTMART_ALL_ACCESS_YEARLY_OFFER_CODE: "yearly-offer",
    HOTMART_ALL_ACCESS_YEARLY_PRICE: "290",
};

const original = { ...process.env };

beforeEach(() => {
    // The module validates on import, so each case needs a fresh one.
    vi.resetModules();
});

afterEach(() => {
    process.env = { ...original };
});

async function loadEnv() {
    return import("./server");
}

describe("SUBSCRIPTIONS_ENABLED", () => {
    // The configuration this actually ships with.
    it("boots with the flag off and none of the eight variables set", async () => {
        process.env.SUBSCRIPTIONS_ENABLED = "false";
        for (const key of Object.keys(REQUIRED_WHEN_ENABLED)) {
            delete process.env[key];
        }

        const { env } = await loadEnv();

        expect(env.SUBSCRIPTIONS_ENABLED).toBe(false);
        expect(env.HOTMART_ALL_ACCESS_MONTHLY_PRODUCT_ID).toBeUndefined();
    });

    it("refuses to boot with the flag on and the variables missing", async () => {
        process.env.SUBSCRIPTIONS_ENABLED = "true";
        for (const key of Object.keys(REQUIRED_WHEN_ENABLED)) {
            delete process.env[key];
        }

        await expect(loadEnv()).rejects.toThrow(/SUBSCRIPTIONS_ENABLED=true/);
    });

    // The failure names every missing variable at once, so turning this on is
    // one boot cycle rather than eight.
    it("names all eight missing variables in one message", async () => {
        process.env.SUBSCRIPTIONS_ENABLED = "true";
        for (const key of Object.keys(REQUIRED_WHEN_ENABLED)) {
            delete process.env[key];
        }

        await expect(loadEnv()).rejects.toThrow(
            /MONTHLY_PRODUCT_ID.*MONTHLY_CHECKOUT_CODE.*YEARLY_PRICE/s
        );
    });

    // A partial configuration is the dangerous case: it looks done.
    it("refuses to boot when only some of the eight are set", async () => {
        process.env.SUBSCRIPTIONS_ENABLED = "true";
        for (const [key, value] of Object.entries(REQUIRED_WHEN_ENABLED)) {
            process.env[key] = value;
        }
        delete process.env.HOTMART_ALL_ACCESS_YEARLY_OFFER_CODE;

        await expect(loadEnv()).rejects.toThrow(/YEARLY_OFFER_CODE/);
    });

    it("boots with the flag on once all eight are set", async () => {
        process.env.SUBSCRIPTIONS_ENABLED = "true";
        for (const [key, value] of Object.entries(REQUIRED_WHEN_ENABLED)) {
            process.env[key] = value;
        }

        const { env } = await loadEnv();

        expect(env.SUBSCRIPTIONS_ENABLED).toBe(true);
        // Coerced to a number, not left as the string it arrived as.
        expect(env.HOTMART_ALL_ACCESS_MONTHLY_PRICE).toBe(29);
    });
});
