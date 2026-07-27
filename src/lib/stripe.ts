import "server-only";

import Stripe from "stripe";
import { env } from "@/data/env/server";

// Single, shared Stripe client — the same pattern as `aj` in ./arcjet.ts.
// Building one instance here instead of calling `new Stripe(...)` at each call
// site keeps the secret key and the API version in exactly one place.
//
// `server-only` makes the build fail if this module is ever imported from a
// client component. That import is the guardrail that stops the secret key
// from being bundled into browser JavaScript — a mistake that is invisible in
// development and catastrophic in production.
//
// About `apiVersion`: Stripe versions its API by date, and each release can
// reshape request and response payloads. stripe-node v22 already defaults to
// the version it was generated against, so passing it changes no behaviour
// today. It is here because the TypeScript types shipped in the package
// describe THIS version and no other — so when the package is upgraded, this
// literal stops type-checking and forces a deliberate look at the changelog
// instead of a silent payload change at runtime.
export const stripe = new Stripe(env.STRIPE_SECRET_KEY, {
    apiVersion: "2026-06-24.dahlia",
    typescript: true,
});

// Stripe holds every amount as an integer in the currency's smallest unit —
// cents for USD — because binary floating point cannot represent 0.1 exactly
// and money must never round wrong. Products in this project store whole
// dollars (`ProductTable.priceInDollars` is an `integer`), so these two
// functions are the only places that conversion should happen.
export function dollarsToCents(dollars: number) {
    return Math.round(dollars * 100);
}

export function centsToDollars(cents: number) {
    return cents / 100;
}
