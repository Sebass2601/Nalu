import "server-only";

import { HotmartApiError, hotmartFetch } from "./hotmart";

// Typed wrappers over the handful of Hotmart endpoints this app actually uses.
//
// Kept separate from `hotmart.ts` so that file stays about transport — tokens,
// retries, errors — and this one stays about what the endpoints mean.
//
// PATHS ARE NOT GUESSABLE. Hotmart namespaces by product area — products under
// `/products/`, sales and subscriptions under `/payments/` — and it answers an
// unknown URL with exactly the same `404 not_found` it uses for a resource that
// does not exist. There is no probe that tells the two apart: a wrong HTTP verb
// against a real path returns that same 404 too. So a misspelled path does not
// look like a bug, it looks like missing data, and it will be blamed on whoever
// typed the ID.
//
// Verified against production 2026-08-13: the products, sales-history and
// subscriptions paths below returned 200 with real data. The refund and cancel
// paths could not be verified — they need a real sale and a real subscriber —
// and are marked as such at their definitions. `hotmartApi.test.ts` pins every
// one of these strings.

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
        // `/products/`, NOT `/payments/`. Hotmart namespaces its APIs by
        // product area rather than putting everything under one prefix, and
        // `/payments/api/v1/products` answers a 404 that looks exactly like
        // "no such product" — which is how this first shipped, rejecting a
        // perfectly real product ID. Sales and subscriptions genuinely do live
        // under `/payments/`; products do not.
        const data = await hotmartFetch<{ items?: HotmartProduct[] }>(
            `/products/api/v1/products?${query}`
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
// PATH UNVERIFIED — needs a real approved sale to exercise, and Hotmart's 404
// for a wrong URL is indistinguishable from its 404 for an unknown transaction.
// Confirm at the first live refund; if it fails, suspect the path before
// suspecting the transaction code.
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
// PATH UNVERIFIED — needs a real subscriber to exercise. Same caveat as the
// refund above. Unreachable at launch anyway: SUBSCRIPTIONS_ENABLED is false
// and no Hotmart subscription product exists.
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
