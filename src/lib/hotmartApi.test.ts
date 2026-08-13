import { beforeEach, describe, expect, it, vi } from "vitest";

// Locks the REST paths each wrapper calls.
//
// This exists because one of them was wrong in a way nothing could catch.
// `getHotmartProduct` asked `/payments/api/v1/products`, inferred from a
// subscriptions example in Hotmart's own sandbox documentation. Hotmart answers
// an unknown URL with `404 not_found` — the identical response it gives for a
// product that does not exist — so the admin panel rejected a real, live,
// approved product ID and blamed the operator for the typo.
//
// Worse, the failure is unfalsifiable from the outside: Hotmart returns the same
// `404 not_found` for a wrong path AND a wrong HTTP verb, so there is no probe
// that distinguishes "this endpoint is misspelled" from "this thing is missing".
// Asserting the literal strings is the only guard available.
//
// Verified against production on 2026-08-13:
//   /products/api/v1/products              -> 200, filters by id
//   /payments/api/v1/sales/history         -> 200
//   /payments/api/v1/subscriptions         -> 200
//
// NOT verifiable without real data, and therefore still trusted rather than
// proven — confirm each at first live use:
//   /payments/api/v1/sales/{transaction}/refund
//   /payments/api/v1/subscriptions/{code}/cancel

const hotmartFetch = vi.fn();

vi.mock("./hotmart", async () => {
    const actual = await vi.importActual<typeof import("./hotmart")>("./hotmart");
    return { ...actual, hotmartFetch: (...args: unknown[]) => hotmartFetch(...args) };
});

const {
    cancelHotmartSubscription,
    getHotmartProduct,
    getHotmartSale,
    refundHotmartSale,
} = await import("./hotmartApi");

beforeEach(() => {
    hotmartFetch.mockReset();
    hotmartFetch.mockResolvedValue({ items: [] });
});

function requestedPath() {
    return String(hotmartFetch.mock.calls[0]?.[0] ?? "");
}

describe("endpoint namespaces", () => {
    // Products live under /products/. Sales and subscriptions live under
    // /payments/. Assuming one prefix for all three is exactly the mistake this
    // file exists to prevent.
    it("looks products up under /products/, never /payments/", () => {
        void getHotmartProduct("8304905");

        expect(requestedPath()).toContain("/products/api/v1/products");
        expect(requestedPath()).not.toContain("/payments/");
    });

    it("filters products by the 7-digit id", () => {
        void getHotmartProduct("8304905");

        expect(requestedPath()).toContain("id=8304905");
    });

    it("looks sales up under /payments/", () => {
        void getHotmartSale("HP17715690036014");

        expect(requestedPath()).toContain("/payments/api/v1/sales/history");
        expect(requestedPath()).toContain("transaction=HP17715690036014");
    });

    it("refunds under /payments/, keyed by transaction", () => {
        void refundHotmartSale("HP17715690036014");

        expect(requestedPath()).toBe(
            "/payments/api/v1/sales/HP17715690036014/refund"
        );
    });

    it("cancels a subscription under /payments/, keyed by subscriber code", () => {
        void cancelHotmartSubscription("B2HNQAXJ");

        expect(requestedPath()).toBe(
            "/payments/api/v1/subscriptions/B2HNQAXJ/cancel"
        );
    });
});

describe("getHotmartProduct", () => {
    // The endpoint FILTERS rather than fetches: an unknown id comes back as an
    // empty list with a 200, not a 404.
    it("returns null when the filter matches nothing", async () => {
        hotmartFetch.mockResolvedValue({ items: [] });

        await expect(getHotmartProduct("9999999")).resolves.toBeNull();
    });

    it("returns the product when the filter matches", async () => {
        hotmartFetch.mockResolvedValue({
            items: [{ id: 8304905, name: "Curso", status: "ACTIVE" }],
        });

        await expect(getHotmartProduct("8304905")).resolves.toMatchObject({
            id: 8304905,
        });
    });

    // Null, not a throw: the caller is a form validating what somebody typed,
    // and "no such product" is an expected answer there.
    it("returns null rather than throwing on a 404", async () => {
        const { HotmartApiError } = await import("./hotmart");
        hotmartFetch.mockRejectedValue(
            new HotmartApiError(404, "nope", "/products/api/v1/products")
        );

        await expect(getHotmartProduct("8304905")).resolves.toBeNull();
    });

    // But a real failure must still surface. Swallowing a 500 would let the
    // admin save codes that were never actually checked.
    it("rethrows anything that is not a 404", async () => {
        const { HotmartApiError } = await import("./hotmart");
        hotmartFetch.mockRejectedValue(
            new HotmartApiError(500, "boom", "/products/api/v1/products")
        );

        await expect(getHotmartProduct("8304905")).rejects.toBeInstanceOf(
            HotmartApiError
        );
    });
});
