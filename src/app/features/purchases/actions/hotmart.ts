"use server";

import { redirect } from "next/navigation";
import { getPublicProduct } from "@/app/features/products/db/products";
import { getCurrentUser } from "@/app/features/users/actions/currentUser";
import { activeOfferCode } from "@/app/features/products/lib/promoOffer";
import { buildCheckoutUrl } from "../lib/checkoutLink";
import { userOwnsProduct } from "../db/purchases";

// Sends the buyer to Hotmart's payment page.
//
// This used to create a Checkout Session and redirect to the URL it returned.
// Hotmart has no such API — its payment page is a static address — so the whole
// job is now: check who is asking, look up the codes, build a URL, redirect.
//
// SECURITY. The original carried a long comment explaining why this action
// accepts only a product ID and never a bound price: a Server Action is a
// public HTTP endpoint, and arguments bound inside a client component travel in
// the request body where anyone can edit them, so a signature taking the whole
// product would let a caller name their own price.
//
// That property survives and gets stronger. There is now no amount anywhere in
// the request — Hotmart owns the price, and nothing here can express one. The
// `discountMode` argument is gone too: it existed because a Stripe session had
// exactly one discount slot, forcing a choice between the regional price and a
// promo code. Hotmart's payment page has its own coupon field, so the buyer
// simply types a code there and the whole branch disappears.
export async function startCheckout(productId: string) {
    // These two redirect rather than throw, because this action is reachable
    // straight from the product page. A thrown error there would show a crash
    // screen for two entirely ordinary situations: not being signed in yet, and
    // already owning the thing.
    const { user } = await getCurrentUser({ withFullUser: true });
    if (user == null) redirect("/login");

    // Together rather than in sequence. Neither needs what the other produces,
    // and awaited one after another they cost two round trips the buyer spends
    // looking at a page that cannot yet tell them anything.
    const [product, alreadyOwned] = await Promise.all([
        // Shared with the purchase page, and it filters to public products — so
        // someone who guessed the ID of an unpublished product cannot buy it
        // straight from this endpoint.
        getPublicProduct(productId),
        // Re-checked here and not only on the page, because this endpoint is
        // reachable directly and a page-level check protects nothing.
        userOwnsProduct({ userId: user.id, productId }),
    ]);

    if (product == null) throw new Error("Producto no encontrado.");

    if (alreadyOwned) {
        redirect("/products");
    }

    const offerCode = activeOfferCode(product);

    // A product drafted here before it exists in Hotmart. Refusing is
    // deliberate: there is no amount we could invent to proceed with, and
    // sending a buyer to a broken payment page is worse than an error.
    if (product.checkoutCode == null || offerCode == null) {
        throw new Error(
            `El producto ${product.id} no está configurado en Hotmart.`
        );
    }

    const url = buildCheckoutUrl({
        checkoutCode: product.checkoutCode,
        offerCode,
        email: user.email,
        name: user.name,
        userId: user.id,
    });

    // Leaves the app entirely. `redirect` throws internally to unwind, so
    // nothing after this line runs — and it must sit outside any try/catch that
    // would swallow that control-flow signal.
    redirect(url);
}
