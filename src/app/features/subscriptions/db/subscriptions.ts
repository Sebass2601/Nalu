import { db } from "@/drizzle/db";
import {
    SubscriptionTable,
    activeSubscriptionStatuses,
    type SubscriptionStatus,
} from "@/drizzle/schema";
import { and, desc, eq, inArray } from "drizzle-orm";
import { cacheTag } from "next/cache";
import { getSubscriptionUserTag } from "./cache/subscriptions";
import { expireSubscriptionCache } from "./cache/subscriptions";
import { subscriptionGrantsAccess } from "../lib/subscriptionAccess";

// Writes Stripe's view of a subscription into our mirror.
//
// Keyed on `stripeSubscriptionId` rather than `userId`, because that is the
// identifier Stripe sends and the one with a unique constraint — which is what
// makes a redelivered webhook update the existing row instead of failing or
// duplicating. Stripe retries events, so this runs more than once per real
// change, sometimes out of order.
export async function upsertSubscription(data: {
    userId: string;
    stripeCustomerId: string;
    stripeSubscriptionId: string;
    stripePriceId: string;
    interval: "month" | "year";
    status: SubscriptionStatus;
    currentPeriodEnd: Date;
    cancelAtPeriodEnd: boolean;
}) {
    const [subscription] = await db
        .insert(SubscriptionTable)
        .values(data)
        .onConflictDoUpdate({
            target: SubscriptionTable.stripeSubscriptionId,
            // `userId` is deliberately absent: the subscription's owner can
            // never change, and letting a replayed event rewrite it would hand
            // someone else's plan to the wrong account.
            set: {
                stripePriceId: data.stripePriceId,
                interval: data.interval,
                status: data.status,
                currentPeriodEnd: data.currentPeriodEnd,
                cancelAtPeriodEnd: data.cancelAtPeriodEnd,
                updatedAt: new Date(),
            },
        })
        .returning();

    expireSubscriptionCache(data.userId);

    return subscription;
}

// Does this person currently have a subscription that grants access?
//
// "Active" is `active | trialing | past_due` (see activeSubscriptionStatuses).
// `past_due` counts on purpose: the card bounced and Stripe is retrying, and
// locking someone out the same hour punishes a customer who is still paying.
// Stripe moves genuinely dead subscriptions to `unpaid` or `canceled`.
//
// The `currentPeriodEnd > now` check is the safety net. It means access ends on
// the date the customer paid through even if the webhook announcing the
// cancellation never arrives — the row expires on its own rather than granting
// access forever because an HTTP request was lost.
//
// That check is applied by `getUserSubscription` below rather than in the query
// here, and the split is deliberate. This function is cached; a comparison
// against `new Date()` inside it would be made once, when the entry is filled,
// and then replayed. The safety net would only re-arm when something happened
// to regenerate the entry — with the default cache profile, up to fifteen
// minutes late, and only on a read. A net that checks the time it last checked
// the time is not a net.
//
// A user may own several rows — one per subscription Stripe ever created for
// them — so this takes the furthest-reaching. Ordering matters because during
// the overlap between a resubscription and the old subscription's cancellation
// event both rows can briefly qualify, and the renewal date shown on
// /subscription should be the one the customer is actually paid through.
//
// Dropping the date from the query does not change which row is chosen: the
// furthest-reaching active row is still the only candidate, and if its period
// has passed then no row's has not.
//
// Cached per user, so `userId` is part of the cache key and one user's answer
// can never be served to another.
async function getLatestActiveSubscriptionRow(userId: string) {
    "use cache";
    cacheTag(getSubscriptionUserTag(userId));

    return db.query.SubscriptionTable.findFirst({
        where: and(
            eq(SubscriptionTable.userId, userId),
            inArray(SubscriptionTable.status, [...activeSubscriptionStatuses])
        ),
        orderBy: desc(SubscriptionTable.currentPeriodEnd),
    });
}

// The subscription that currently grants access, or undefined. The row comes
// from cache; whether it is still live is decided here, at request time, on
// every call.
export async function getUserSubscription(userId: string) {
    const subscription = await getLatestActiveSubscriptionRow(userId);

    return subscriptionGrantsAccess(subscription) ? subscription : undefined;
}

export async function hasActiveSubscription(userId: string) {
    return (await getUserSubscription(userId)) != null;
}

// Looks a subscription up by Stripe's ID so the webhook can find which local
// user it belongs to. Not cached — the webhook needs the current truth, and
// this is keyed by something no page ever holds.
export async function getSubscriptionByStripeId(stripeSubscriptionId: string) {
    return db.query.SubscriptionTable.findFirst({
        where: eq(
            SubscriptionTable.stripeSubscriptionId,
            stripeSubscriptionId
        ),
    });
}
