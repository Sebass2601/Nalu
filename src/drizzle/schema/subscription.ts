import { relations } from "drizzle-orm";
import { boolean, index, pgEnum, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { createdAt, id, updatedAt } from "../schemaHelpers";
import { UserTable } from "./user";

// How often the subscriber is billed. Stripe also supports "day" and "week",
// but we only ever create monthly and yearly prices, so the column refuses
// anything else rather than silently storing a plan we do not sell.
export const subscriptionIntervals = ["month", "year"] as const;
export type SubscriptionInterval = (typeof subscriptionIntervals)[number];
export const subscriptionIntervalEnum = pgEnum(
    "subscription_interval",
    subscriptionIntervals
);

// Mirrors Stripe's own subscription statuses exactly. Copying their vocabulary
// instead of reducing it to a boolean matters, because these states are not
// interchangeable: `past_due` is a paying customer whose card just failed and
// who is mid-retry, while `canceled` is someone who left. Collapsing them early
// would throw away the information needed to decide who still gets access.
export const subscriptionStatuses = [
    "active",
    "trialing",
    "past_due",
    "unpaid",
    "canceled",
    "incomplete",
    "incomplete_expired",
    "paused",
] as const;
export type SubscriptionStatus = (typeof subscriptionStatuses)[number];
export const subscriptionStatusEnum = pgEnum(
    "subscription_status",
    subscriptionStatuses
);

// Which statuses actually unlock content. `trialing` counts because a trial is
// a deliberate giveaway, and `past_due` counts because cutting someone off the
// hour their card bounces punishes a customer who is still paying and whose
// retry usually succeeds. Stripe eventually moves an unrecoverable subscription
// to `unpaid` or `canceled`, and those are where access genuinely stops.
export const activeSubscriptionStatuses = [
    "active",
    "trialing",
    "past_due",
] as const satisfies readonly SubscriptionStatus[];

// A local mirror of the subscription that lives in Stripe. Stripe remains the
// source of truth — this table exists so that answering "can this person read
// this course" is one indexed database read instead of an HTTP round trip to
// Stripe on every page view.
export const SubscriptionTable = pgTable("subscriptions", {
    id,
    // Deliberately NOT unique. A user who cancels and later resubscribes gets a
    // brand-new Stripe subscription, so their history is several rows: one per
    // subscription Stripe ever created for them. Forcing one row per user would
    // make that second signup fail its insert, and since the failure happens
    // inside the webhook, the customer would be charged and silently receive
    // nothing.
    //
    // Keeping the rows separate also survives out-of-order delivery: if Stripe
    // redelivers the old subscription's `deleted` event after the new one's
    // `created`, it cancels the old row and leaves the new one untouched.
    // `getUserSubscription` only ever looks at rows that are still active, so
    // the expired ones are invisible to access checks.
    userId: uuid()
        .notNull()
        .references(() => UserTable.id, { onDelete: "cascade" }),
    stripeCustomerId: text().notNull(),
    // Unique so a redelivered webhook cannot create a duplicate row — Stripe
    // retries events, and this is what makes the upsert idempotent.
    stripeSubscriptionId: text().notNull().unique(),
    stripePriceId: text().notNull(),
    interval: subscriptionIntervalEnum().notNull(),
    status: subscriptionStatusEnum().notNull(),
    // End of the paid-up window. Kept so access can be reasoned about locally,
    // and so a cancelled-but-not-yet-expired subscription still works until the
    // date the customer already paid through.
    currentPeriodEnd: timestamp({ withTimezone: true }).notNull(),
    // True when the customer has cancelled but their paid period has not run
    // out. They keep access until `currentPeriodEnd`; Stripe will not renew.
    cancelAtPeriodEnd: boolean().notNull().default(false),
    createdAt,
    updatedAt,
}, table => [
    // `userId` used to be unique, and that constraint came with an index for
    // free. Now that it is gone, this replaces it: Postgres does not index a
    // foreign key column on its own, and every access check on a subscription
    // course filters this table by user.
    index("subscriptions_userId_idx").on(table.userId),
]);

export const SubscriptionRelationships = relations(
    SubscriptionTable,
    ({ one }) => ({
        user: one(UserTable, {
            fields: [SubscriptionTable.userId],
            references: [UserTable.id],
        }),
    })
);
