"use server";

import { redirect } from "next/navigation";
import { getCurrentUser } from "@/app/features/users/actions/currentUser";
import { getOrCreateStripeCustomer } from "@/app/features/users/db/users";
import { getUserCoupon } from "@/app/features/countryGroups/lib/getUserCoupon";
import { hasActiveSubscription } from "../db/subscriptions";
import { stripe } from "@/lib/stripe";
import { env } from "@/data/env/server";
import { subscriptionIntervals } from "@/drizzle/schema";

// Starts a subscription checkout and sends the buyer to Stripe.
//
// Mirrors the one-time purchase action: the browser supplies only the billing
// interval, and everything that decides what is charged — which price, which
// customer, which discount — is resolved here on the server.
export async function startSubscriptionCheckout(interval: string) {
    // The interval arrives from a form field, so it is untrusted input and is
    // validated against the enum rather than used to index anything directly.
    if (!subscriptionIntervals.includes(interval as "month" | "year")) {
        throw new Error("Intervalo de suscripción inválido.");
    }

    const { user } = await getCurrentUser({ withFullUser: true });
    if (user == null) redirect("/login");

    // Already subscribed: send them to manage the plan they have instead of
    // letting them buy a second one. The unique constraint on
    // subscriptions.userId would reject the duplicate anyway, but only after
    // Stripe had taken the money.
    if (await hasActiveSubscription(user.id)) redirect("/subscription");

    // A subscription REQUIRES a Customer — Stripe attaches the plan, invoices,
    // saved card and billing portal to it. Unlike one-time payments,
    // `customer_email` alone is not enough.
    const stripeCustomerId = await getOrCreateStripeCustomer({
        id: user.id,
        email: user.email,
        name: user.name,
    });

    const priceId =
        interval === "month"
            ? env.STRIPE_ALL_ACCESS_MONTHLY_PRICE_ID
            : env.STRIPE_ALL_ACCESS_YEARLY_PRICE_ID;

    const coupon = await getUserCoupon();

    const session = await stripe.checkout.sessions.create({
        ui_mode: "hosted_page",
        mode: "subscription",
        customer: stripeCustomerId,
        line_items: [{ price: priceId, quantity: 1 }],
        // The PPP coupon was created with `duration: "forever"`, so it applies
        // to every renewal rather than only the first invoice.
        //
        // Note this discount is frozen at today's rate: the coupon binds to the
        // subscription, so changing a country group's percentage later does not
        // move existing subscribers.
        discounts: coupon ? [{ coupon: coupon.stripeCouponId }] : undefined,
        branding_settings: {
            border_style: "rounded",
            button_color: "#fef08a",
            display_name: "Nalu",
        },
        // Read back by the webhook. Stripe returns it unchanged, which makes it
        // the only field in the payload we can trust to identify the buyer.
        metadata: { userId: user.id },
        // Also stamped on the subscription itself. `checkout.session.completed`
        // carries the session metadata, but later events —
        // `customer.subscription.updated`, renewals, cancellations — carry only
        // the subscription, so without this they would have no way back to a
        // local user.
        subscription_data: { metadata: { userId: user.id } },
        success_url: `${env.SERVER_URL}/api/webhooks/stripe?stripeSessionId={CHECKOUT_SESSION_ID}`,
        cancel_url: `${env.SERVER_URL}/subscribe`,
    });

    if (session.url == null) {
        throw new Error("No se pudo iniciar la suscripción.");
    }

    redirect(session.url);
}

// Sends an existing subscriber to Stripe's billing portal.
//
// Everything a subscriber might want to do to their plan — cancel, switch
// monthly to yearly, update the card, download invoices — happens there. It is
// far safer than rebuilding those flows: cancellation and proration are exactly
// the operations where a subtle bug either keeps charging someone who left or
// gives away content for free.
//
// The portal's features and the plans it offers must be enabled in the Stripe
// Dashboard first (Settings → Billing → Customer portal), per mode.
export async function openBillingPortal() {
    const { user } = await getCurrentUser({ withFullUser: true });
    if (user == null) redirect("/login");

    const stripeCustomerId = await getOrCreateStripeCustomer({
        id: user.id,
        email: user.email,
        name: user.name,
    });

    const session = await stripe.billingPortal.sessions.create({
        customer: stripeCustomerId,
        return_url: `${env.SERVER_URL}/subscription`,
    });

    redirect(session.url);
}
