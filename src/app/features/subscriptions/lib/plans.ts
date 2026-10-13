import "server-only";

import { env } from "@/data/env/server";

// The two all-access plans.
//
// These used to be read from Stripe, with a comment explaining that duplicating
// the numbers locally would let the page advertise one figure while checkout
// charged another. Hotmart exposes no endpoint that returns an offer's price,
// so that safeguard is gone and the numbers are mirrored by hand in env.
//
// That is a genuine regression and worth naming rather than hiding: nothing in
// this codebase can detect a mismatch between what this returns and what
// Hotmart charges. The mitigation is procedural — repricing is a two-step
// operation, Hotmart first and env second, recorded in the runbook.
//
// No caching, unlike the Stripe version: reading two environment variables does
// not need a day-long cache, and `cacheLife` here would only delay a redeploy
// taking effect.
//
// ---------------------------------------------------------------------------
// The three build-log notices this causes are LOAD-BEARING. Do not "fix" them.
//
// Reading env here makes the four subscription routes bail out of static
// prerendering, and `next build` reports each bail as a
// `DYNAMIC_SERVER_USAGE` error. The build still succeeds, and the routes are
// correctly absent from `.next/prerender-manifest.json` — they render per
// request instead.
//
// That is the only arrangement that works. The Hetzner image is BUILT with
// `SUBSCRIPTIONS_ENABLED=false` as a placeholder (see the deploy workflow) and
// RUN with the real value from `/opt/nalu/app.env`. Were these routes
// prerendered, they would be baked as 404s from the build-time placeholder, and
// setting the flag to `true` in `NALU_APP_ENV` would never bring them back.
//
// So the noise is the sound of the feature flag working. Silencing it by
// hoisting the read to a module constant does not help — that was measured —
// and silencing it by prerendering would break the switch.
//
// While a promotion is live at build time there are SIX, not three. The
// Samhain announcement in the consumer layout also waits for the request
// (`connection()`, to know whether a sale has ended), so each of the three
// routes reports that as well as the navbar's session read. Same routes, same
// cause, equally harmless: they still answer 404 with the flag off, and the
// count drops back to three once no product has a promotion. To see which
// route and which call is behind each notice, `next build --debug-prerender`
// prints them in full.
// ---------------------------------------------------------------------------

export type SubscriptionPlans = {
    monthly: {
        priceInDollars: number;
        checkoutCode: string;
        offerCode: string;
        externalProductId: string;
    };
    yearly: {
        priceInDollars: number;
        checkoutCode: string;
        offerCode: string;
        externalProductId: string;
        // What the same year would cost billed monthly, so the annual saving
        // can be shown as a concrete number instead of a claim.
        equivalentMonthlyInDollars: number;
        savingsPercent: number;
    };
};

// Returns null when subscriptions are switched off.
//
// Null rather than throwing, and rather than an "empty" plans object: callers
// then have one obvious branch, and TypeScript makes them handle it. While
// `SUBSCRIPTIONS_ENABLED` is false the eight HOTMART_ALL_ACCESS_* variables are
// legitimately absent, so there is nothing to return.
export function getSubscriptionPlans(): SubscriptionPlans | null {
    if (!env.SUBSCRIPTIONS_ENABLED) return null;

    // The env refinement guarantees all eight are present whenever the flag is
    // true, so these assertions cannot fire at runtime — they exist to tell
    // TypeScript what the refinement already enforces at boot.
    const monthlyPrice = env.HOTMART_ALL_ACCESS_MONTHLY_PRICE!;
    const yearlyPrice = env.HOTMART_ALL_ACCESS_YEARLY_PRICE!;

    return {
        monthly: {
            priceInDollars: monthlyPrice,
            checkoutCode: env.HOTMART_ALL_ACCESS_MONTHLY_CHECKOUT_CODE!,
            offerCode: env.HOTMART_ALL_ACCESS_MONTHLY_OFFER_CODE!,
            externalProductId: env.HOTMART_ALL_ACCESS_MONTHLY_PRODUCT_ID!,
        },
        yearly: {
            priceInDollars: yearlyPrice,
            checkoutCode: env.HOTMART_ALL_ACCESS_YEARLY_CHECKOUT_CODE!,
            offerCode: env.HOTMART_ALL_ACCESS_YEARLY_OFFER_CODE!,
            externalProductId: env.HOTMART_ALL_ACCESS_YEARLY_PRODUCT_ID!,
            equivalentMonthlyInDollars: yearlyPrice / 12,
            savingsPercent: Math.round(
                (1 - yearlyPrice / (monthlyPrice * 12)) * 100
            ),
        },
    };
}
