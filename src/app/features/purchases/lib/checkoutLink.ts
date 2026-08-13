// Builds the URL that sends a buyer to Hotmart's payment page.
//
// This is the whole of "start a checkout" with Hotmart. There is no API that
// creates a session — the payment page is a static address, and everything we
// want it to know travels as query parameters. So this is a pure function with
// no I/O, which makes the one piece of checkout logic that is genuinely ours
// completely testable.
//
// What that also means: no amount is ever sent. Hotmart owns the price, so the
// class of bug where a caller names their own price cannot exist here.

export type CheckoutLinkFields = {
    // The hotlink from Products -> HotLinks, e.g. "W12345678X". NOT the 7-digit
    // product ID — that one matches incoming webhooks and is useless here.
    checkoutCode: string;
    // Which offer, i.e. which price. A promotion is a second offer on the same
    // product, so this is the only thing that changes when one is running.
    offerCode: string;
    email: string;
    name?: string | null;
    // The buyer's Nalu user ID, carried in `sck`.
    userId: string;
};

const CHECKOUT_ORIGIN = "https://pay.hotmart.com";

export function buildCheckoutUrl({
    checkoutCode,
    offerCode,
    email,
    name,
    userId,
}: CheckoutLinkFields): string {
    const url = new URL(`${CHECKOUT_ORIGIN}/${checkoutCode}`);

    url.searchParams.set("off", offerCode);

    // Prefilling is not only a convenience. The email is how the webhook finds
    // the buyer's account when `sck` does not survive, so the less the buyer
    // has to retype, the fewer purchases arrive under an address we have never
    // seen. They can still edit it — Hotmart's field is not locked — which is
    // exactly why `sck` below exists as the primary channel.
    url.searchParams.set("email", email);
    if (name) url.searchParams.set("name", name);

    // `sck` is a tracking parameter, and the ONLY custom data channel Hotmart
    // offers: there is no metadata field. It comes back on every webhook as
    // `purchase.origin.sck`, which is how a payment is matched to the account
    // that made it.
    //
    // Only the user ID goes in it. Carrying the product ID too would mean
    // betting on an undocumented length limit, and the product is recoverable
    // anyway from `data.product.id` — which is needed regardless, since a
    // marketplace or affiliate sale carries no `sck` at all.
    //
    // A buyer can edit this in the URL. The worst they achieve is gifting their
    // own purchase to another account, which is not an attack worth defending
    // against.
    url.searchParams.set("sck", userId);

    return url.toString();
}
