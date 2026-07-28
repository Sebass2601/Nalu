import { db } from "@/drizzle/db";
import {
    SubscriptionTable,
    activeSubscriptionStatuses,
    type SubscriptionStatus,
} from "@/drizzle/schema";
import { and, desc, eq, gt, inArray } from "drizzle-orm";
import { cacheTag } from "next/cache";
import { getSubscriptionUserTag } from "./cache/subscriptions";
import { expireSubscriptionCache } from "./cache/subscriptions";

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
// cancellation never arrives — the database expires them on its own rather than
// granting access forever because an HTTP request was lost.
//
// A user may own several rows — one per subscription Stripe ever created for
// them — so this filters to the ones that still grant access and takes the
// furthest-reaching. Ordering matters because during the overlap between a
// resubscription and the old subscription's cancellation event both rows can
// briefly qualify, and the renewal date shown on /subscription should be the
// one the customer is actually paid through.
//
// Cached per user, so `userId` is part of the cache key and one user's answer
// can never be served to another.
export async function getUserSubscription(userId: string) {
    "use cache";
    cacheTag(getSubscriptionUserTag(userId));

    return db.query.SubscriptionTable.findFirst({
        where: and(
            eq(SubscriptionTable.userId, userId),
            inArray(SubscriptionTable.status, [...activeSubscriptionStatuses]),
            gt(SubscriptionTable.currentPeriodEnd, new Date())
        ),
        orderBy: desc(SubscriptionTable.currentPeriodEnd),
    });
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
