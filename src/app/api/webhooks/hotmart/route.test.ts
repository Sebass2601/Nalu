import { beforeEach, describe, expect, it, vi } from "vitest";

// The handlers reach the database and Hotmart; this file is about the route's
// gatekeeping, so both are stubbed out.
const handlePurchaseApproved = vi.fn();
const handlePurchaseRefunded = vi.fn();
const handleInformationalEvent = vi.fn();

vi.mock("./handlers", () => ({
    handlePurchaseApproved: (...args: unknown[]) =>
        handlePurchaseApproved(...args),
    handlePurchaseRefunded: (...args: unknown[]) =>
        handlePurchaseRefunded(...args),
    handleInformationalEvent: (...args: unknown[]) =>
        handleInformationalEvent(...args),
}));

const { POST } = await import("./route");

// Matches HOTMART_HOTTOK in src/test/setup.ts.
const VALID_HOTTOK = "test-hottok";

function post(body: unknown, hottok?: string) {
    return POST(
        new Request("https://naluescuela.com/api/webhooks/hotmart", {
            method: "POST",
            headers: hottok == null ? {} : { "x-hotmart-hottok": hottok },
            body: JSON.stringify(body),
        }) as never
    );
}

const approvedEvent = {
    id: "evt-1",
    event: "PURCHASE_APPROVED",
    data: { purchase: { transaction: "HP123" } },
};

beforeEach(() => {
    handlePurchaseApproved.mockReset();
    handlePurchaseRefunded.mockReset();
    handleInformationalEvent.mockReset();
});

describe("hottok verification", () => {
    // Anyone can POST here. The hottok is the only thing standing between the
    // internet and free course access.
    it("rejects a delivery with no hottok", async () => {
        const response = await post(approvedEvent);

        expect(response.status).toBe(403);
        expect(handlePurchaseApproved).not.toHaveBeenCalled();
    });

    it("rejects a wrong hottok", async () => {
        const response = await post(approvedEvent, "not-the-token");

        expect(response.status).toBe(403);
        expect(handlePurchaseApproved).not.toHaveBeenCalled();
    });

    // A longer string must not be accepted, and must not crash: timingSafeEqual
    // throws outright on unequal buffer lengths, which is why the length is
    // checked before the compare.
    it("rejects a hottok of a different length without throwing", async () => {
        const response = await post(approvedEvent, `${VALID_HOTTOK}-extra`);

        expect(response.status).toBe(403);
    });

    it("accepts the correct hottok", async () => {
        const response = await post(approvedEvent, VALID_HOTTOK);

        expect(response.status).toBe(200);
        expect(handlePurchaseApproved).toHaveBeenCalledOnce();
    });
});

describe("event dispatch", () => {
    it("routes PURCHASE_COMPLETE to the same handler as approval", async () => {
        await post({ ...approvedEvent, event: "PURCHASE_COMPLETE" }, VALID_HOTTOK);

        expect(handlePurchaseApproved).toHaveBeenCalledOnce();
    });

    it.each(["PURCHASE_REFUNDED", "PURCHASE_CHARGEBACK"])(
        "routes %s to the refund handler",
        async event => {
            await post({ ...approvedEvent, event }, VALID_HOTTOK);

            expect(handlePurchaseRefunded).toHaveBeenCalledOnce();
        }
    );

    it.each([
        "PURCHASE_CANCELED",
        "PURCHASE_EXPIRED",
        "PURCHASE_DELAYED",
        "PURCHASE_BILLET_PRINTED",
        "PURCHASE_PROTEST",
    ])("logs %s without granting or revoking anything", async event => {
        await post({ ...approvedEvent, event }, VALID_HOTTOK);

        expect(handleInformationalEvent).toHaveBeenCalledOnce();
        expect(handlePurchaseApproved).not.toHaveBeenCalled();
        expect(handlePurchaseRefunded).not.toHaveBeenCalled();
    });

    // Hotmart can add events, and an unknown one must not take the route down.
    it("logs an unrecognised event instead of failing", async () => {
        const response = await post(
            { ...approvedEvent, event: "SOMETHING_NEW" },
            VALID_HOTTOK
        );

        expect(response.status).toBe(200);
        expect(handleInformationalEvent).toHaveBeenCalledOnce();
    });
});

describe("malformed deliveries", () => {
    it("rejects a body that is not JSON", async () => {
        const response = await POST(
            new Request("https://naluescuela.com/api/webhooks/hotmart", {
                method: "POST",
                headers: { "x-hotmart-hottok": VALID_HOTTOK },
                body: "not json",
            }) as never
        );

        expect(response.status).toBe(400);
    });

    // Without an id there is no dedupe key, so the delivery cannot be handled
    // safely. 400 rather than 500: retrying will not add one.
    it("rejects an event with no id", async () => {
        const response = await post(
            { event: "PURCHASE_APPROVED", data: {} },
            VALID_HOTTOK
        );

        expect(response.status).toBe(400);
        expect(handlePurchaseApproved).not.toHaveBeenCalled();
    });
});

describe("handler failures", () => {
    // The payment already happened. Giving up would silently rob the buyer, so
    // a 500 asks Hotmart to retry with backoff.
    it("answers 500 so Hotmart retries", async () => {
        handlePurchaseApproved.mockRejectedValueOnce(new Error("db down"));

        const response = await post(approvedEvent, VALID_HOTTOK);

        expect(response.status).toBe(500);
    });
});
