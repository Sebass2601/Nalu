import { relations } from "drizzle-orm";
import { boolean, index, pgEnum, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { createdAt, id, updatedAt } from "../schemaHelpers";
import { UserTable } from "./user";

// How often the subscriber is billed. Hotmart also supports weekly and other
// intervals, but we only ever sell monthly and yearly plans, so the column
// refuses anything else rather than silently storing a plan we do not sell.
export const subscriptionIntervals = ["month", "year"] as const;
export type SubscriptionInterval = (typeof subscriptionIntervals)[number];
export const subscriptionIntervalEnum = pgEnum(
    "subscription_interval",
    subscriptionIntervals
);

// Hotmart's own subscription vocabulary, copied exactly.
//
// Deliberately NOT a translation of Stripe's. The two sets genuinely differ —
// Hotmart distinguishes *who* cancelled, which Stripe does not — so mapping one
// onto the other would lose information and crash on the first status this
// codebase had never heard of.
//
// Keeping the full vocabulary rather than reducing it to a boolean matters for
// the same reason it did before: `DELAYED` is a paying customer whose payment
// is mid-retry, while `CANCELLED_BY_CUSTOMER` is someone who left. Collapsing
// them early throws away what is needed to decide who still gets access.
export const subscriptionStatuses = [
    "ACTIVE",
    "INACTIVE",
    "DELAYED",
    "CANCELLED_BY_CUSTOMER",
    "CANCELLED_BY_SELLER",
    "CANCELLED_BY_ADMIN",
    "STARTED",
    "OVERDUE",
] as const;
export type SubscriptionStatus = (typeof subscriptionStatuses)[number];
export const subscriptionStatusEnum = pgEnum(
    "subscription_status",
    subscriptionStatuses
);

// Which statuses actually unlock content.
//
// `DELAYED` and `OVERDUE` count for the reason `past_due` used to: cutting
// someone off the hour their payment bounces punishes a customer who is still
// paying and whose retry usually succeeds. Hotmart eventually moves an
// unrecoverable subscription to `INACTIVE` or one of the CANCELLED_BY_ states,
// and those are where access genuinely stops.
//
// Note this list is only half the answer — `currentPeriodEnd` is the other
// half, which is what lets someone who cancelled keep the time they paid for.
export const activeSubscriptionStatuses = [
    "ACTIVE",
    "STARTED",
    "DELAYED",
    "OVERDUE",
] as const satisfies readonly SubscriptionStatus[];

// A local mirror of the subscription that lives in Hotmart. Hotmart remains the
// source of truth — this table exists so that answering "can this person read
// this course" is one indexed database read instead of an HTTP round trip to
// Hotmart on every page view.
export const SubscriptionTable = pgTable("subscriptions", {
    id,
    // Deliberately NOT unique. A user who cancels and later resubscribes gets a
    // brand-new Hotmart subscription, so their history is several rows: one per
    // subscription Hotmart ever created for them. Forcing one row per user would
    // make that second signup fail its insert, and since the failure happens
    // inside the webhook, the customer would be charged and silently receive
    // nothing.
    //
    // Keeping the rows separate also survives out-of-order delivery: if Hotmart
    // redelivers the old subscription's cancellation after the new one's first
    // event, it cancels the old row and leaves the new one untouched.
    // `getUserSubscription` only ever looks at rows that are still active, so
    // the expired ones are invisible to access checks.
    userId: uuid()
        .notNull()
        .references(() => UserTable.id, { onDelete: "cascade" }),
    // Hotmart's `subscriber_code`. Unique so a redelivered webhook cannot
    // create a duplicate row — Hotmart retries events, and this is what makes
    // the upsert idempotent.
    //
    // No customer ID column: Hotmart has no equivalent to store. A buyer is
    // identified by the `sck` value the checkout link carried and by their
    // email, both of which arrive on the event itself.
    externalSubscriptionId: text().notNull().unique(),
    // The Hotmart product behind the plan. Monthly and yearly are two separate
    // products rather than two prices on one, because Hotmart fixes the billing
    // interval at the product level.
    externalProductId: text().notNull(),
    interval: subscriptionIntervalEnum().notNull(),
    status: subscriptionStatusEnum().notNull(),
    // End of the paid-up window. Kept so access can be reasoned about locally,
    // and so a cancelled-but-not-yet-expired subscription still works until the
    // date the customer already paid through.
    currentPeriodEnd: timestamp({ withTimezone: true }).notNull(),
    // True when the customer has cancelled but their paid period has not run
    // out. They keep access until `currentPeriodEnd`; Hotmart will not renew.
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
