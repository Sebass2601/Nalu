import "server-only";

import { env } from "@/data/env/server";

// The single place that knows how to talk to Hotmart.
//
// There is no official Node SDK, so this is hand-written — about sixty lines
// rather than a dependency. It does three things: get an access token, cache
// it, and re-authenticate once if a call comes back 401.
//
// `server-only` makes the build fail if this module is ever imported from a
// client component. That import is the guardrail stopping the client secret
// being bundled into browser JavaScript.

// Where the REST endpoints live. Sandbox and production are entirely separate:
// different credentials, and the sandbox returns fictional canned data for
// these endpoints only — it has no checkout page and delivers no webhooks. So
// a green sandbox run proves the call shape is right, never that the
// integration works.
const API_HOSTS = {
    production: "https://developers.hotmart.com",
    sandbox: "https://sandbox.hotmart.com",
} as const;

// Token issuance lives on its own host and is the same for both environments —
// the credentials decide which world you land in, not the URL.
const TOKEN_URL = "https://api-sec-vlc.hotmart.com/security/oauth/token";

// Refresh this many milliseconds before the token actually expires, so a call
// that starts just under the wire does not arrive just over it.
const EXPIRY_MARGIN_MS = 60_000;

export class HotmartApiError extends Error {
    constructor(
        readonly status: number,
        readonly body: string,
        path: string
    ) {
        super(`Hotmart ${status} on ${path}: ${body.slice(0, 200)}`);
        this.name = "HotmartApiError";
    }
}

type CachedToken = { value: string; expiresAt: number };

let cachedToken: CachedToken | null = null;

// Exported for tests only. Module-level state persists across test cases in one
// file, so without this a test that primed the cache would silently change the
// behaviour of the next one.
export function resetHotmartToken() {
    cachedToken = null;
}

async function fetchToken(): Promise<CachedToken> {
    // Credentials go in the query string AND the Basic header. That is Hotmart's
    // documented shape, unusual as it looks — the header alone is rejected.
    const url = new URL(TOKEN_URL);
    url.searchParams.set("grant_type", "client_credentials");
    url.searchParams.set("client_id", env.HOTMART_CLIENT_ID);
    url.searchParams.set("client_secret", env.HOTMART_CLIENT_SECRET);

    const response = await fetch(url, {
        method: "POST",
        headers: {
            // The stored value must NOT already carry the "Basic " prefix —
            // see the env schema. Doubling it yields a 401 indistinguishable
            // from wrong credentials.
            Authorization: `Basic ${env.HOTMART_BASIC_TOKEN}`,
        },
    });

    if (!response.ok) {
        const body = await response.text().catch(() => "");
        throw new HotmartApiError(response.status, body, "oauth/token");
    }

    const data = (await response.json()) as {
        access_token: string;
        expires_in: number;
    };

    return {
        value: data.access_token,
        expiresAt: Date.now() + data.expires_in * 1000 - EXPIRY_MARGIN_MS,
    };
}

async function getToken(forceRefresh = false): Promise<string> {
    if (!forceRefresh && cachedToken != null && cachedToken.expiresAt > Date.now()) {
        return cachedToken.value;
    }

    cachedToken = await fetchToken();
    return cachedToken.value;
}

// Calls a Hotmart REST endpoint and returns its parsed body.
//
// `path` is everything after the host, e.g. "/payments/api/v1/sales/history".
//
// Retries exactly once on 401, and only on 401. A token can expire between the
// cache check and the request arriving, which is an ordinary race worth
// absorbing — but a genuinely revoked credential must fail loudly rather than
// loop, so the retry does not repeat.
export async function hotmartFetch<T>(
    path: string,
    init: RequestInit = {}
): Promise<T> {
    const url = `${API_HOSTS[env.HOTMART_SERVER]}${path}`;

    const send = async (token: string) =>
        fetch(url, {
            ...init,
            headers: {
                ...init.headers,
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
            },
        });

    let response = await send(await getToken());

    if (response.status === 401) {
        response = await send(await getToken(true));
    }

    if (!response.ok) {
        const body = await response.text().catch(() => "");
        throw new HotmartApiError(response.status, body, path);
    }

    // A 204, or any empty body, parses as null rather than throwing. Hotmart's
    // refund endpoint documents an empty response and asks callers to read the
    // status code alone.
    const text = await response.text();
    return (text.length > 0 ? JSON.parse(text) : null) as T;
}
