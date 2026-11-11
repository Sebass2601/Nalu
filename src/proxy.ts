import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { aj, ajSensitive } from "@/lib/arcjet";
import { COUNTRY_HEADER_KEY } from "@/lib/userCountryHeader";

// --- Next.js 16 note -------------------------------------------------------
// What older tutorials call `middleware.ts` is `proxy.ts` in Next.js 16, and
// the exported function is `proxy` (here provided by NextAuth's `auth`
// wrapper). Proxy runs on the Node.js runtime and fires before every matched
// route. It is an OPTIMISTIC gate only: it reads the session from the signed
// JWT cookie (no database round-trip) so it stays fast on prefetches. The real
// authorization gates for /admin live in the database-backed admin pages,
// layout, Server Actions, and upload handlers.
// ---------------------------------------------------------------------------

// Any URL under this prefix requires an admin session.
const ADMIN_PREFIX = "/admin";

// Auth screens a signed-in user has no reason to see again.
const AUTH_PAGES = ["/login", "/sign-up", "/recuperar-contrasena"];

// Routes that get the stricter per-IP rate limit: the auth screens, plus the
// page a reset email leads to. That one is kept out of AUTH_PAGES on purpose —
// someone still signed in on this device may open the link, and bouncing them
// to the home page would leave them no way to finish the reset.
//
// A Server Action posts back to the URL of the page it lives on, so listing a
// page here also limits its form submissions — which is what holds the
// "send me a reset email" form to a human pace.
const RATE_LIMITED_PAGES = [...AUTH_PAGES, "/restablecer-contrasena"];

function matchesAny(path: string, prefixes: string[]) {
    return prefixes.some(p => path === p || path.startsWith(`${p}/`));
}

// Whether to ask Arcjet for a decision at all.
//
// Outside production there is nothing to protect — no bots and no attacks
// against localhost — and the call is expensive here: the round trip from a
// home connection runs around 350ms, over Arcjet's 1000ms development budget,
// so every request waits out the deadline and then fails open. That is a full
// second of latency per page in exchange for no protection whatsoever, and a
// request billed against the account's quota on every reload.
//
// The switch is NODE_ENV, which is fixed when the app is built. Deciding from
// something like the Host header instead would be a hole rather than a
// convenience: anyone could send `Host: localhost` and walk straight past the
// WAF. Set ARCJET_ENABLED=true locally to exercise the rules on demand.
const PROTECTION_ENABLED =
    process.env.NODE_ENV === "production" ||
    process.env.ARCJET_ENABLED === "true";

// Baseline hardening applied to every response that leaves the proxy.
function withSecurityHeaders(response: NextResponse) {
    response.headers.set("X-Frame-Options", "DENY");
    response.headers.set("X-Content-Type-Options", "nosniff");
    response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
    return response;
}

// `auth((req) => ...)` is NextAuth v5's proxy helper: it decodes the JWT cookie
// and hands us the session on `req.auth` before our logic runs.
export default auth(async req => {
    const { nextUrl } = req;
    const path = nextUrl.pathname;

    const onAuthPage = matchesAny(path, AUTH_PAGES);
    // Is this one of the sensitive routes? Those get the extra rate limit.
    const rateLimited = matchesAny(path, RATE_LIMITED_PAGES);

    // 0. Arcjet runs first: WAF shield + bot detection on every route, plus a
    //    100-req/min sliding-window rate limit on sensitive auth routes only.
    //    If any rule denies the request, forbid access outright (403) before
    //    any auth or routing logic runs. Null when protection is off, which
    //    only happens outside production — see PROTECTION_ENABLED.
    const decision = PROTECTION_ENABLED
        ? await (rateLimited ? ajSensitive : aj).protect(req)
        : null;

    if (decision != null) {
        // Observability (dev only): log every verdict so we can confirm rules
        // are actually evaluated (not silently failing). `results` is the
        // per-rule breakdown. Silent in production to avoid noisy logs.
        if (process.env.NODE_ENV !== "production") {
            console.log("[arcjet]", {
                path,
                conclusion: decision.conclusion, // ALLOW | DENY | CHALLENGE | ERROR
                reason: decision.reason,
                ruleResults: decision.results.map(r => ({
                    rule: r.reason.constructor.name,
                    conclusion: r.conclusion,
                })),
            });
        }

        // Fail OPEN on Arcjet errors (bad key, service unreachable): log and
        // let the request through rather than locking everyone out.
        // Recommended by Arcjet's best practices.
        if (decision.isErrored()) {
            console.error("[arcjet] error decision:", decision.reason.message);
        } else if (decision.isDenied()) {
            const message = decision.reason.isRateLimit()
                ? "Too many requests"
                : decision.reason.isBot()
                  ? "Automated clients are not allowed"
                  : "Forbidden";
            return withSecurityHeaders(
                NextResponse.json({ error: message }, { status: 403 })
            );
        }
    }

    const session = req.auth;
    const isLoggedIn = Boolean(session?.user);
    const isAdmin = session?.user?.role === "admin";

    // 1. Guard /admin/* — non-admins never reach the route.
    //    Anonymous visitors go to login; signed-in non-admins go home.
    if (path.startsWith(ADMIN_PREFIX) && !isAdmin) {
        const target = isLoggedIn ? "/" : "/login";
        return withSecurityHeaders(
            NextResponse.redirect(new URL(target, nextUrl))
        );
    }

    // 2. Keep signed-in users off the auth screens.
    if (isLoggedIn && onAuthPage) {
        const target = isAdmin ? "/admin" : "/";
        return withSecurityHeaders(
            NextResponse.redirect(new URL(target, nextUrl))
        );
    }

    // 3. Otherwise continue. Forward the buyer's country (from Arcjet's
    //    geolocation) as a request header so server components can compute the
    //    PPP price. Undefined on localhost/unknown IPs, and with protection
    //    off there is no decision to read it from — in both cases the header
    //    is simply absent and pricing falls back to the default, which is what
    //    already happened locally.
    const requestHeaders = new Headers(req.headers);
    // Strip any client-supplied value first so a caller can't spoof their
    // country to grant themselves a discount — only this proxy may set it.
    requestHeaders.delete(COUNTRY_HEADER_KEY);
    const country = decision?.ip.country;
    if (country) {
        requestHeaders.set(COUNTRY_HEADER_KEY, country);
    }
    return withSecurityHeaders(
        NextResponse.next({ request: { headers: requestHeaders } })
    );
});

// Run on every route EXCEPT API handlers, Next internals, and static assets.
// Excluding these keeps auth callbacks, JS/CSS, and images loading untouched.
export const config = {
    matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\.png$).*)"],
};
