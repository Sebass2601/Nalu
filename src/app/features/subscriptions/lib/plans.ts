import "server-only";

import { cacheLife } from "next/cache";
import { stripe } from "@/lib/stripe";
import { env } from "@/data/env/server";

// The two all-access plans, read from Stripe rather than hardcoded here.
//
// Stripe is where the amounts actually live — a Price is immutable, so changing
// what a plan costs means creating a new Price and pointing the env var at it.
// Duplicating the numbers in the code would let the page advertise one figure
// while checkout charged another, which is the one inconsistency worth spending
// a network call to avoid.
//
// Cached for a day because prices change roughly never, and this sits on a page
// every visitor sees. `cacheLife` rather than a tag: there is no write path in
// this app that could invalidate it, since the change happens in the Stripe
// dashboard, so time-based expiry is the honest model.
export async function getSubscriptionPlans() {
    "use cache";
    cacheLife("days");

    const [monthly, yearly] = await Promise.all([
        stripe.prices.retrieve(env.STRIPE_ALL_ACCESS_MONTHLY_PRICE_ID),
        stripe.prices.retrieve(env.STRIPE_ALL_ACCESS_YEARLY_PRICE_ID),
    ]);

    const monthlyInDollars = (monthly.unit_amount ?? 0) / 100;
    const yearlyInDollars = (yearly.unit_amount ?? 0) / 100;

    return {
        monthly: { priceInDollars: monthlyInDollars },
        yearly: {
            priceInDollars: yearlyInDollars,
            // What the same year would cost billed monthly, so the annual
            // saving can be shown as a concrete number instead of a claim.
            equivalentMonthlyInDollars: yearlyInDollars / 12,
            savingsPercent: Math.round(
                (1 - yearlyInDollars / (monthlyInDollars * 12)) * 100
            ),
        },
    };
}
