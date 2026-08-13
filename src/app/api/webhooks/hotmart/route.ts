import { timingSafeEqual } from "node:crypto";
import { NextRequest } from "next/server";
import { env } from "@/data/env/server";
import {
    handleInformationalEvent,
    handlePurchaseApproved,
    handlePurchaseRefunded,
    type HotmartEvent,
} from "./handlers";

// The only place a payment becomes access.
//
// Nothing on the buyer's return trip grants anything. That is deliberate: the
// browser can be closed, refreshed, or lied to, so the client's word that a
// payment happened is worth nothing. Hotmart telling our server directly is
// worth everything, and that conversation happens here.
//
// POST only. The Stripe version also exported GET, because its return URL
// carried a session ID that could be exchanged for a verified session — the
// buyer's own browser could safely provision. Hotmart's thank-you URL is
// configured per offer rather than per checkout and carries no trustworthy
// per-buyer token, so there is nothing to exchange and `/purchase/success`
// simply waits for this route instead.
//
// Note: proxy.ts excludes /api from its matcher, so Arcjet's bot detection does
// not sit in front of this route. That matters — Hotmart's servers would look
// exactly like the automated traffic Arcjet is there to block.

// Compares the shared secret without leaking it through timing.
//
// `timingSafeEqual` throws on buffers of different lengths, so the length is
// checked first — and that check is itself a (tiny) leak of the secret's
// length, which is not worth defending against and cannot be avoided anyway.
//
// This matters more here than it would elsewhere. Hotmart authenticates with a
// fixed string sent on every request, so an attacker gets unlimited attempts at
// the same value; a naive `===` short-circuits on the first differing byte and
// turns that into a practical attack.
function hottokMatches(received: string | null): boolean {
    if (received == null) return false;

    const expected = Buffer.from(env.HOTMART_HOTTOK, "utf8");
    const actual = Buffer.from(received, "utf8");

    if (expected.length !== actual.length) return false;

    return timingSafeEqual(expected, actual);
}

export async function POST(request: NextRequest): Promise<Response> {
    if (!hottokMatches(request.headers.get("x-hotmart-hottok"))) {
        // 403, not 500. A forged or misconfigured request will never become
        // valid, so asking Hotmart to retry it would be pointless noise.
        console.warn("[hotmart] rejected a delivery with an invalid hottok");
        return Response.json({ received: false }, { status: 403 });
    }

    let event: HotmartEvent;
    try {
        event = (await request.json()) as HotmartEvent;
    } catch {
        return Response.json({ received: false }, { status: 400 });
    }

    if (event?.id == null || event?.event == null) {
        return Response.json({ received: false }, { status: 400 });
    }

    try {
        switch (event.event) {
            // The refund window closing (COMPLETE) re-runs the same idempotent
            // handler as the original approval, which makes it a free safety
            // net for a first delivery that never arrived.
            case "PURCHASE_APPROVED":
            case "PURCHASE_COMPLETE":
                await handlePurchaseApproved(event);
                break;

            // A chargeback is not a refund — the bank claws the money back
            // rather than us returning it — but the consequence for access is
            // identical.
            case "PURCHASE_REFUNDED":
            case "PURCHASE_CHARGEBACK":
                await handlePurchaseRefunded(event);
                break;

            // Nothing was ever provisioned for these, so there is nothing to
            // undo. Logged because an empty log makes "I paid and got nothing"
            // unanswerable.
            case "PURCHASE_CANCELED":
            case "PURCHASE_EXPIRED":
            case "PURCHASE_DELAYED":
            case "PURCHASE_BILLET_PRINTED":
            case "PURCHASE_PROTEST":
                handleInformationalEvent(event);
                break;

            // Subscription events. Subscribed to from day one so that enabling
            // subscriptions later is a change to .env rather than a return trip
            // to Hotmart's webhook dialog — but no subscription product exists
            // yet, so none of these can currently arrive.
            case "SUBSCRIPTION_CANCELLATION":
            case "SWITCH_PLAN":
            case "UPDATE_SUBSCRIPTION_CHARGE_DATE":
                handleInformationalEvent(event);
                break;

            default:
                handleInformationalEvent(event);
        }
    } catch (error) {
        // A 500 asks Hotmart to retry with backoff. That is the right answer
        // for a transient failure such as the database being briefly
        // unavailable — the payment already happened, so giving up would
        // silently rob the buyer of what they paid for.
        console.error(`[hotmart] failed handling ${event.event}:`, error);
        return Response.json({ received: false }, { status: 500 });
    }

    return Response.json({ received: true });
}
