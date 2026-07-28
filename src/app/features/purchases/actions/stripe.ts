"use server";

import { redirect } from "next/navigation";
import { getPublicProduct } from "@/app/features/products/db/products";
import { getCurrentUser } from "@/app/features/users/actions/currentUser";
import { getUserCoupon } from "@/app/features/countryGroups/lib/getUserCoupon";
import { stripe } from "@/lib/stripe";
import { env } from "@/data/env/server";
import { userOwnsProduct } from "../db/purchases";

// Creates a Checkout Session and sends the buyer to Stripe's hosted payment
// page.
//
// We embedded this form originally, following the reference implementation.
// That turned out to be a poor fit: Managed Payments only permits
// `hosted_page` and `embedded_page`, and `embedded_page` renders a full
// checkout PAGE — test-mode banner, product summary, currency selector — whose
// content outgrew the iframe on narrow screens and was cut off. Since Managed
// Payments already dictates the currency selector, receipts, payment methods
// and branding, embedding bought almost no customisation while costing a whole
// class of layout bug. Stripe's own page is responsive by construction.
//
// SECURITY — this deliberately differs from the reference implementation.
// There, the client component calls the action as
// `getClientSessionSecret.bind(null, product, user)`, passing the whole product
// (including `priceInDollars`) and the whole user (including `id`). A Server
// Action is a public HTTP endpoint, and arguments bound inside a client
// component travel in the request body where anyone can edit them — so that
// signature lets a caller name their own price and charge the purchase to
// somebody else's account.
//
// This version accepts only a product ID and a discount MODE. The price comes
// from the database, the buyer comes from the session cookie, and the regional
// discount comes from the country header the proxy stamped. Nothing that
// decides what is charged, or to whom, is taken from the browser.
//
// The mode is the one thing the browser does choose, and it is safe to let it:
// it selects between two discount sources but cannot name an amount. Picking
// `promo` only asks Stripe to show its code field, and Stripe alone decides
// whether a code entered there is real, still valid, and worth what it claims.
// The worst a tampered value can do is opt the buyer out of their own regional
// discount.
export async function startCheckout(productId: string, formData: FormData) {
    // These two cases redirect rather than throw, because this action is now
    // reachable straight from the product page. A thrown error there would show
    // a crash screen for two situations that are completely ordinary: not being
    // signed in yet, and already owning the thing.
    const { user } = await getCurrentUser({ withFullUser: true });
    if (user == null) redirect("/login");

    // Shared with the purchase page, and it filters to public products — so
    // someone who guessed the ID of an unpublished product cannot buy it
    // straight from this endpoint.
    const product = await getPublicProduct(productId);
    if (product == null) throw new Error("Producto no encontrado.");

    // Every product is mirrored into Stripe on create and update, so a missing
    // price ID means that sync never ran (a product predating it, or one whose
    // sync failed). Refusing here is deliberate: inventing an amount instead
    // would bypass the Stripe catalogue that reporting depends on.
    if (product.stripePriceId == null) {
        throw new Error(
            `Producto ${product.id} no está sincronizado con Stripe.`
        );
    }

    // Re-checked here and not only on the page, because this endpoint is
    // reachable directly and a page-level check protects nothing.
    if (await userOwnsProduct({ userId: user.id, productId })) {
        redirect("/products");
    }

    // A Checkout Session has exactly ONE discount slot: Stripe rejects
    // `discounts` and `allow_promotion_codes` together with "You may only
    // specify one of these parameters". So the regional price and a promo code
    // cannot both apply, and the buyer chooses which one they want before
    // getting here.
    //
    // The submit button they pressed decides it. A button's name/value reaches
    // the server only when that particular button submits the form, so the
    // ordinary "Comprar ahora" path sends nothing and keeps the regional price.
    const wantsPromoCode = formData.get("discountMode") === "promo";

    // The line item carries the FULL price; the PPP discount is applied by the
    // Stripe coupon instead. Keeping the discount in the coupon means Stripe
    // computes the final amount, and the invoice records why it was lower.
    const coupon = wantsPromoCode ? null : await getUserCoupon();

    const session = await stripe.checkout.sessions.create({
        ui_mode: "hosted_page",
        mode: "payment",
        // References the pre-created Price in Stripe's catalogue rather than
        // inventing an amount inline. The reference repo builds `price_data`
        // here; using a real Price ID instead is what lets Stripe's own
        // reporting answer "how many people bought this product", which matters
        // more here because subscription revenue already resists attribution.
        //
        // The Price carries the FULL amount — the PPP discount is applied by the
        // coupon below, so Stripe computes the final total and the invoice
        // records why it was lower.
        line_items: [{ price: product.stripePriceId, quantity: 1 }],
        // Exactly one of these two is ever set — see `wantsPromoCode` above.
        // The code field is offered whenever no regional coupon is going on the
        // session, which covers both the buyer who chose a code over their
        // regional price and the buyer who never had a regional price at all.
        discounts: coupon ? [{ coupon: coupon.stripeCouponId }] : undefined,
        allow_promotion_codes: coupon ? undefined : true,
        // Stripe's page, so our CSS cannot reach it — `branding_settings` is
        // the only way to make it feel like ours. Still applies on the hosted
        // page, which is why leaving the embed cost no branding.
        branding_settings: {
            border_style: "rounded",
            button_color: "#fef08a", // yellow-200, the site's accent
            display_name: "Nalu",
        },
        customer_email: user.email,
        // No `payment_intent_data.receipt_email` here, even though the
        // reference implementation sets it. Managed Payments — on by default
        // for this account — sends the receipt itself and rejects the whole
        // request if we also ask for one, which surfaces as the checkout form
        // silently failing to render.
        // Read back by the webhook to decide who to grant what. This is the only
        // trustworthy channel for it: we set it server-side and Stripe returns
        // it to us unchanged.
        metadata: {
            productId: product.id,
            userId: user.id,
        },
        // Where Stripe sends the browser once payment completes.
        // `{CHECKOUT_SESSION_ID}` is a placeholder Stripe substitutes for real.
        // The hosted page uses `success_url`/`cancel_url`; `return_url` is the
        // embedded equivalent and is rejected in this mode.
        success_url: `${env.SERVER_URL}/api/webhooks/stripe?stripeSessionId={CHECKOUT_SESSION_ID}`,
        // Backing out returns them to the product rather than dead-ending on
        // Stripe. Only the hosted page supports this — the embedded modes
        // reject it, since there is nowhere to put a back button.
        cancel_url: `${env.SERVER_URL}/products/${product.id}`,
    });

    if (session.url == null) {
        throw new Error("No se pudo iniciar el pago.");
    }

    // Leaves the app entirely. `redirect` throws internally to unwind, so
    // nothing after this line runs — and it must sit outside any try/catch that
    // would swallow that control-flow signal.
    redirect(session.url);
}
