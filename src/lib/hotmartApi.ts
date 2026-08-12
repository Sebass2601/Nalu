import "server-only";

import { HotmartApiError, hotmartFetch } from "./hotmart";

// Typed wrappers over the handful of Hotmart endpoints this app actually uses.
//
// Kept separate from `hotmart.ts` so that file stays about transport — tokens,
// retries, errors — and this one stays about what the endpoints mean. Every
// function here is a candidate for the sandbox, whose canned responses match
// these shapes.

// --- Products ------------------------------------------------------------
//
// Read-only. Hotmart has no endpoint that creates or updates a product: the
// dashboard owns the catalogue and every product passes a human content review.
// This exists purely so the admin panel can VERIFY a pasted code rather than
// trusting it and discovering at checkout that it was a typo.

export type HotmartProduct = {
    id: number;
    name: string;
    ucode: string;
    status:
        | "DRAFT"
        | "ACTIVE"
        | "PAUSED"
        | "NOT_APPROVED"
        | "IN_REVIEW"
        | "DELETED"
        | "CHANGES_PENDING_ON_PRODUCT";
    format?: string;
};

// Looks up one product by its 7-digit ID.
//
// Returns null when Hotmart does not know the code, rather than throwing. The
// caller is a form validating what someone typed, and "no such product" is an
// expected answer there — an error would turn a typo into a crash. Genuine
// failures (network, revoked credentials) still throw.
export async function getHotmartProduct(
    productId: string
): Promise<HotmartProduct | null> {
    const query = new URLSearchParams({ id: productId, max_results: "1" });

    try {
        const data = await hotmartFetch<{ items?: HotmartProduct[] }>(
            `/payments/api/v1/products?${query}`
        );

        // The endpoint filters rather than fetches, so an unknown id comes back
        // as an empty list with a 200 — not a 404.
        return data?.items?.[0] ?? null;
    } catch (error) {
        if (error instanceof HotmartApiError && error.status === 404) return null;
        throw error;
    }
}

// --- Sales ---------------------------------------------------------------

export type HotmartSale = {
    purchase: {
        transaction: string;
        status: string;
        order_date?: number;
        approved_date?: number;
        price?: { value: number; currency_value: string };
        offer?: { code?: string; coupon_code?: string };
        payment?: { method?: string; type?: string };
    };
    product?: { id: number; name: string };
    buyer?: { name?: string; email?: string };
};

// One sale, by transaction code.
//
// Used for two different jobs: rendering a receipt, and re-verifying a webhook
// before granting anything. The second is why this exists at all — Hotmart's
// webhook carries a static shared token with no signature, so an event that
// claims a payment happened is only worth acting on if Hotmart independently
// confirms it.
export async function getHotmartSale(
    transaction: string
): Promise<HotmartSale | null> {
    const query = new URLSearchParams({ transaction, max_results: "1" });

    const data = await hotmartFetch<{ items?: HotmartSale[] }>(
        `/payments/api/v1/sales/history?${query}`
    );

    return data?.items?.[0] ?? null;
}

// Requests a refund for a sale.
//
// Hotmart refuses unless the sale is Approved or Completed, is not in a trial,
// and was not paid by BACS or SEPA — those two the buyer must reclaim through
// their own bank. The response body is empty by design; the status code is the
// whole answer, which is why `hotmartFetch` tolerates an empty body.
export async function refundHotmartSale(transaction: string): Promise<void> {
    await hotmartFetch<null>(
        `/payments/api/v1/sales/${encodeURIComponent(transaction)}/refund`,
        { method: "POST" }
    );
}

// --- Subscriptions -------------------------------------------------------

export type HotmartSubscriptionResult = {
    status: "ACTIVE" | "INACTIVE";
    subscriber_code: string;
};

// Cancels a subscription, keyed on the subscriber code.
//
// `sendEmail` controls whether Hotmart tells the customer. We pass true: the
// cancellation was their own request, and a silent one invites a "did that
// work?" support message. Hotmart also notifies its own sub-systems, so the
// matching webhook arrives afterwards and updates the local row — this call
// changes Hotmart's state, the webhook changes ours.
export async function cancelHotmartSubscription(
    subscriberCode: string,
    sendEmail = true
): Promise<HotmartSubscriptionResult | null> {
    return hotmartFetch<HotmartSubscriptionResult>(
        `/payments/api/v1/subscriptions/${encodeURIComponent(subscriberCode)}/cancel`,
        {
            method: "POST",
            body: JSON.stringify({ send_email: sendEmail }),
        }
    );
}
