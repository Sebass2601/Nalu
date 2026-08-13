import { beforeEach, describe, expect, it, vi } from "vitest";
import { HotmartApiError, hotmartFetch, resetHotmartToken } from "./hotmart";

const fetchMock = vi.fn();
vi.stubGlobal("fetch", fetchMock);

function tokenResponse(expiresIn = 3600) {
    return {
        ok: true,
        status: 200,
        text: async () =>
            JSON.stringify({ access_token: "tok", expires_in: expiresIn }),
        json: async () => ({ access_token: "tok", expires_in: expiresIn }),
    };
}

function jsonResponse(body: unknown) {
    return {
        ok: true,
        status: 200,
        text: async () => JSON.stringify(body),
        json: async () => body,
    };
}

function errorResponse(status: number, body = "nope") {
    return { ok: false, status, text: async () => body };
}

beforeEach(() => {
    fetchMock.mockReset();
    resetHotmartToken();
});

describe("hotmartFetch", () => {
    // The token costs a round trip, and every page that touches Hotmart would
    // pay it twice if the cache did not work.
    it("fetches a token once and reuses it across calls", async () => {
        fetchMock
            .mockResolvedValueOnce(tokenResponse())
            .mockResolvedValueOnce(jsonResponse({ items: [] }))
            .mockResolvedValueOnce(jsonResponse({ items: [] }));

        await hotmartFetch("/payments/api/v1/sales/history");
        await hotmartFetch("/payments/api/v1/sales/history");

        // One token request plus two calls — not two token requests.
        expect(fetchMock).toHaveBeenCalledTimes(3);
    });

    // A token can expire between the cache check and the request landing.
    // That race is ordinary and worth absorbing silently.
    it("re-authenticates once when a call returns 401", async () => {
        fetchMock
            .mockResolvedValueOnce(tokenResponse())
            .mockResolvedValueOnce(errorResponse(401, "expired"))
            .mockResolvedValueOnce(tokenResponse())
            .mockResolvedValueOnce(jsonResponse({ ok: true }));

        await expect(hotmartFetch("/x")).resolves.toEqual({ ok: true });
    });

    // But a revoked credential must fail loudly rather than loop forever.
    it("gives up after one retry when 401 persists", async () => {
        fetchMock
            .mockResolvedValueOnce(tokenResponse())
            .mockResolvedValueOnce(errorResponse(401))
            .mockResolvedValueOnce(tokenResponse())
            .mockResolvedValueOnce(errorResponse(401));

        await expect(hotmartFetch("/x")).rejects.toBeInstanceOf(HotmartApiError);
    });

    // The status has to survive, because callers branch on it: a 404 from the
    // product lookup means "that code does not exist", which the admin form
    // reports as a validation error rather than a crash.
    it("throws HotmartApiError carrying the status", async () => {
        fetchMock
            .mockResolvedValueOnce(tokenResponse())
            .mockResolvedValueOnce(errorResponse(404, "not found"));

        await expect(hotmartFetch("/x")).rejects.toMatchObject({ status: 404 });
    });

    // Hotmart's refund endpoint documents an empty body and asks callers to
    // read the status code alone. JSON.parse("") would throw.
    it("returns null for an empty body instead of throwing", async () => {
        fetchMock
            .mockResolvedValueOnce(tokenResponse())
            .mockResolvedValueOnce({ ok: true, status: 204, text: async () => "" });

        await expect(hotmartFetch("/x")).resolves.toBeNull();
    });

    // An expired cached token must not be handed out. Without the margin, a
    // token expiring in 30s could be used for a request that arrives after it
    // has died.
    it("refreshes a token that is within the expiry margin", async () => {
        fetchMock
            .mockResolvedValueOnce(tokenResponse(30)) // inside the 60s margin
            .mockResolvedValueOnce(jsonResponse({ a: 1 }))
            .mockResolvedValueOnce(tokenResponse(3600))
            .mockResolvedValueOnce(jsonResponse({ b: 2 }));

        await hotmartFetch("/one");
        await hotmartFetch("/two");

        // Two token requests, because the first was already effectively stale.
        expect(fetchMock).toHaveBeenCalledTimes(4);
    });
});
