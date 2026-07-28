import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import Stripe from "stripe";
import { db } from "@/drizzle/db";
import { ProductTable, UserTable } from "@/drizzle/schema";
import { upsertSubscription } from "@/app/features/subscriptions/db/subscriptions";
import { stripe } from "@/lib/stripe";
import { env } from "@/data/env/server";
import {
    insertPurchase,
    refundPurchase,
} from "@/app/features/purchases/db/purchases";
import {
    addUserCourseAccess,
    revokeUserCourseAccess,
} from "@/app/features/courses/db/userCourseAccess";

// The only place in the application where a payment turns into access.
//
// Nothing on the purchase page grants anything. That is deliberate: the browser
// can be closed, refreshed, or lied to, so the client's word that a payment
// happened is worth nothing. Stripe telling our server directly is worth
// everything, and that conversation happens here.
//
// This route is reached two different ways, which is why it exports both verbs:
//
//   POST — Stripe's server-to-server webhook. Authoritative, signature-verified,
//          and retried until it gets a 2xx. This is the one that guarantees
//          access is eventually granted even if the buyer closes the tab
//          mid-payment.
//   GET  — the buyer's own browser, sent here by the Checkout `return_url`. It
//          provisions immediately so they are not staring at a "you own
//          nothing" page while waiting for the webhook, then forwards them on.
//
// Both funnel into `processStripeCheckout`, which is idempotent — because with
// two entry points plus Stripe's retries, it will genuinely run more than once
// for a single payment, sometimes at the same moment.
//
// Note: proxy.ts excludes /api from its matcher, so Arcjet's bot detection does
// not sit in front of this route. That matters — Stripe's servers would look
// exactly like the automated traffic Arcjet is there to block.

export async function GET(request: NextRequest) {
    const stripeSessionId =
        request.nextUrl.searchParams.get("stripeSessionId");

    if (stripeSessionId == null) {
        return redirectTo("/products/purchase-failure", request);
    }

    try {
        const checkoutSession = await stripe.checkout.sessions.retrieve(
            stripeSessionId
        );
        const productId = await processStripeCheckout(checkoutSession);

        // Null means this was a subscription checkout, which grants no single
        // product — send them to their plan instead of a product success page.
        return redirectTo(
            productId == null
                ? "/subscription"
                : `/products/${productId}/success`,
            request
        );
    } catch (error) {
        console.error("[stripe] return_url handling failed:", error);
        return redirectTo("/products/purchase-failure", request);
    }
}

export async function POST(request: NextRequest) {
    // Signature verification needs the EXACT bytes Stripe signed, so the body
    // is read as text and never parsed to JSON first — re-serialising an object
    // changes key order and whitespace and would invalidate the signature.
    const body = await request.text();
    const signature = request.headers.get("stripe-signature");

    if (signature == null) {
        return new Response("Missing stripe-signature header", { status: 400 });
    }

    let event: Stripe.Event;
    try {
        event = stripe.webhooks.constructEvent(
            body,
            signature,
            env.STRIPE_WEBHOOK_SECRET
        );
    } catch (error) {
        // Anyone can POST here; only Stripe can produce a valid signature.
        // A 400 tells Stripe not to retry, because a forged or malformed
        // request will never become valid.
        console.error("[stripe] signature verification failed:", error);
        return new Response("Invalid signature", { status: 400 });
    }

    try {
        switch (event.type) {
            // `completed` fires when checkout finishes. For slower payment
            // methods the money has not actually arrived yet, which is why
            // `processStripeCheckout` re-checks `payment_status` —
            // `async_payment_succeeded` is the event that follows for those.
            case "checkout.session.completed":
            case "checkout.session.async_payment_succeeded":
                await processStripeCheckout(event.data.object);
                break;

            // Covers the entire subscription lifecycle after signup: renewals,
            // interval switches, failed payments moving it to `past_due`, and
            // cancellations. Handling `updated` and `deleted` together is
            // enough because both carry the full subscription object, and the
            // handler simply mirrors whatever state it is given.
            case "customer.subscription.created":
            case "customer.subscription.updated":
            case "customer.subscription.deleted":
                await processStripeSubscription(event.data.object);
                break;

            case "charge.refunded":
                await processStripeRefund(event.data.object);
                break;
        }
    } catch (error) {
        // A 500 asks Stripe to retry with backoff. That is the right answer for
        // a transient failure such as the database being briefly unavailable —
        // the payment already happened, so giving up would silently rob the
        // buyer of what they paid for.
        console.error(`[stripe] failed handling ${event.type}:`, error);
        return new Response("Webhook handler failed", { status: 500 });
    }

    return new Response(null, { status: 200 });
}

// Turns a paid Checkout Session into a purchase row plus course access.
// Returns the product ID so the GET handler knows where to send the buyer.
async function processStripeCheckout(checkoutSession: Stripe.Checkout.Session) {
    const userId = checkoutSession.metadata?.userId;
    const productId = checkoutSession.metadata?.productId;

    // Metadata is set by us when the session is created and returned unchanged
    // by Stripe, so it is the one part of this payload we can trust. Missing
    // metadata means a session this code did not create.
    if (userId == null) {
        throw new Error("Checkout session is missing userId metadata");
    }

    // A subscription checkout grants nothing here. Access is derived live from
    // the subscriptions table, and that table is written by the
    // `customer.subscription.*` events which Stripe sends alongside this one —
    // so this branch only has to say where to send the browser.
    if (checkoutSession.mode === "subscription") {
        return null;
    }

    if (productId == null) {
        throw new Error("Checkout session is missing productId metadata");
    }

    // Guards against provisioning on an unpaid session — the buyer reaching the
    // return_url is not proof that money moved.
    if (checkoutSession.payment_status === "unpaid") {
        throw new Error("Checkout session is not paid");
    }

    const product = await db.query.ProductTable.findFirst({
        where: eq(ProductTable.id, productId),
        columns: {
            id: true,
            name: true,
            description: true,
            imageUrl: true,
        },
        with: { courseProducts: { columns: { courseId: true } } },
    });

    if (product == null) {
        throw new Error(`Product ${productId} no longer exists`);
    }

    const courseIds = product.courseProducts.map(cp => cp.courseId);

    // One transaction: either the buyer gets both the receipt and the access,
    // or neither. A committed purchase with no access granted would look
    // perfectly healthy in the database while the customer sees nothing.
    await db.transaction(async trx => {
        await insertPurchase(
            {
                userId,
                productId,
                // What Stripe actually collected, after any PPP coupon — not
                // the list price. This is the number that has to reconcile
                // against a Stripe payout.
                pricePaidInCents: checkoutSession.amount_total ?? 0,
                // Frozen copy: a receipt must keep showing what was bought even
                // after the product is renamed, repriced, or its image swapped.
                productDetails: {
                    name: product.name,
                    description: product.description,
                    imageUrl: product.imageUrl,
                },
                stripeSessionId: checkoutSession.id,
                stripePaymentIntentId:
                    typeof checkoutSession.payment_intent === "string"
                        ? checkoutSession.payment_intent
                        : (checkoutSession.payment_intent?.id ?? null),
            },
            trx
        );

        // Runs even when the purchase row already existed. Re-granting is a
        // no-op, and it self-heals the case where an earlier attempt wrote the
        // purchase and then died before granting access.
        await addUserCourseAccess({ userId, courseIds }, trx);
    });

    return productId;
}

// Mirrors a Stripe subscription into our own table.
//
// Deliberately a straight copy of whatever Stripe says rather than any local
// reasoning about what "should" have changed. Stripe is the source of truth,
// and its events arrive out of order under retries — so recomputing state here
// would let a late-delivered older event undo a newer one. Writing the object
// as given makes the handler naturally idempotent.
async function processStripeSubscription(subscription: Stripe.Subscription) {
    // Stamped via `subscription_data.metadata` at checkout, because later
    // lifecycle events carry only the subscription and not the session that
    // created it.
    let userId = subscription.metadata?.userId;

    // Fallback for subscriptions created outside our checkout — from the
    // billing portal, or by hand in the dashboard — which never got our
    // metadata. The customer ID still ties them to a user.
    if (userId == null) {
        const customerId =
            typeof subscription.customer === "string"
                ? subscription.customer
                : subscription.customer.id;

        const user = await db.query.UserTable.findFirst({
            columns: { id: true },
            where: eq(UserTable.stripeCustomerId, customerId),
        });

        if (user == null) {
            throw new Error(
                `No user for Stripe customer ${customerId} on subscription ${subscription.id}`
            );
        }
        userId = user.id;
    }

    const item = subscription.items.data[0];
    if (item == null) {
        throw new Error(`Subscription ${subscription.id} has no items`);
    }

    const interval = item.price.recurring?.interval;
    if (interval !== "month" && interval !== "year") {
        throw new Error(
            `Subscription ${subscription.id} has unsupported interval ${interval}`
        );
    }

    await upsertSubscription({
        userId,
        stripeCustomerId:
            typeof subscription.customer === "string"
                ? subscription.customer
                : subscription.customer.id,
        stripeSubscriptionId: subscription.id,
        stripePriceId: item.price.id,
        interval,
        status: subscription.status,
        // The paid-through date lives on the item rather than the subscription
        // in current API versions. Access is checked against this, so a missing
        // value must not silently become "now" and lock a paying user out.
        currentPeriodEnd: new Date(item.current_period_end * 1000),
        // Both fields are checked because Stripe expresses this two different
        // ways depending on the subscription's billing mode. Under the current
        // "flexible" mode a period-end cancellation sets `cancel_at` to that
        // date and leaves `cancel_at_period_end` at false — the boolean is
        // legacy and survives only for integrations created under the older
        // mode. Reading just one of them silently misses half the cases.
        cancelAtPeriodEnd:
            subscription.cancel_at_period_end || subscription.cancel_at != null,
    });
}

// Reverses a purchase when Stripe reports the charge refunded.
async function processStripeRefund(charge: Stripe.Charge) {
    const paymentIntentId =
        typeof charge.payment_intent === "string"
            ? charge.payment_intent
            : charge.payment_intent?.id;

    if (paymentIntentId == null) return;

    await db.transaction(async trx => {
        // Order matters. `refundPurchase` stamps `refundedAt` first so that
        // `revokeUserCourseAccess` no longer counts this purchase as a reason
        // to keep the courses it paid for. Reversed, nothing would be revoked.
        const refunded = await refundPurchase(paymentIntentId, trx);

        // Undefined means already refunded or unknown — either way there is
        // nothing left to take away, so a redelivered event does no harm.
        if (refunded == null) return;

        await revokeUserCourseAccess(
            { userId: refunded.userId, productId: refunded.productId },
            trx
        );
    });
}

function redirectTo(path: string, request: NextRequest) {
    return NextResponse.redirect(new URL(path, request.nextUrl.origin));
}
