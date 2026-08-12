"use server";

import { notFound, redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/drizzle/db";
import { SubscriptionTable, subscriptionIntervals } from "@/drizzle/schema";
import { getCurrentUser } from "@/app/features/users/actions/currentUser";
import { buildCheckoutUrl } from "@/app/features/purchases/lib/checkoutLink";
import { cancelHotmartSubscription } from "@/lib/hotmartApi";
import { env } from "@/data/env/server";
import { getSubscriptionPlans } from "../lib/plans";
import { getUserSubscription, hasActiveSubscription } from "../db/subscriptions";

// Subscription actions.
//
// Written and tested, but unreachable at launch: `SUBSCRIPTIONS_ENABLED` is
// false and no Hotmart subscription product exists. Every entry point below
// checks the flag first, so the failure mode if one is ever linked to by
// accident is a 404 rather than a broken checkout.

// Starts a subscription checkout.
//
// Mirrors the one-time purchase action: the browser supplies only the billing
// interval, and everything deciding what is charged is resolved here. Much of
// what the Stripe version did has simply vanished — there is no Customer to
// create, because Hotmart has no such object and identifies a buyer by the
// `sck` value and email the link carries.
export async function startSubscriptionCheckout(interval: string) {
    const plans = getSubscriptionPlans();
    if (plans == null) notFound();

    // The interval arrives from a form field, so it is untrusted input and is
    // validated against the enum rather than used to index anything directly.
    if (!subscriptionIntervals.includes(interval as "month" | "year")) {
        throw new Error("Intervalo de suscripción inválido.");
    }

    const { user } = await getCurrentUser({ withFullUser: true });
    if (user == null) redirect("/login");

    // Already subscribed: send them to manage the plan they have instead of
    // letting them buy a second one. Hotmart would happily charge twice.
    if (await hasActiveSubscription(user.id)) {
        redirect("/subscription-management");
    }

    const plan = interval === "month" ? plans.monthly : plans.yearly;

    redirect(
        buildCheckoutUrl({
            checkoutCode: plan.checkoutCode,
            offerCode: plan.offerCode,
            email: user.email,
            name: user.name,
            userId: user.id,
        })
    );
}

// Cancels the current subscription.
//
// The Stripe version redirected to a hosted billing portal, which handled
// cancellation, plan switches, card updates and invoices. Hotmart has no
// equivalent portal we can create a session for — but it does expose a real
// cancellation endpoint, so this is a working button rather than a link out.
//
// Hotmart's own state changes here; the local row is updated by the
// SUBSCRIPTION_CANCELLATION webhook that follows. Deliberately not written
// locally too: one writer means the two cannot disagree, and the webhook is the
// one that also fires when a customer cancels from Hotmart's own interface.
export async function cancelSubscription() {
    if (!env.SUBSCRIPTIONS_ENABLED) notFound();

    const { user } = await getCurrentUser({ withFullUser: true });
    if (user == null) redirect("/login");

    const subscription = await getUserSubscription(user.id);

    if (subscription == null) {
        throw new Error("No tienes una suscripción activa.");
    }

    await cancelHotmartSubscription(subscription.externalSubscriptionId, true);

    // Optimistically flag the local row so the page the user lands on does not
    // still offer a cancel button. The webhook remains the source of truth for
    // status and period end; this only touches the flag that says "will not
    // renew", which cancellation has definitively decided.
    await db
        .update(SubscriptionTable)
        .set({ cancelAtPeriodEnd: true })
        .where(
            eq(
                SubscriptionTable.externalSubscriptionId,
                subscription.externalSubscriptionId
            )
        );

    redirect("/subscription-management");
}
