import "server-only";

import { stripe, dollarsToCents } from "@/lib/stripe";
import { env } from "@/data/env/server";
import type { productStatus } from "@/drizzle/schema";

// Keeps each product in our database mirrored by a Product and a Price inside
// Stripe, so checkout can reference a real `price_...` ID instead of inventing
// an amount on the fly.
//
// The awkward part of this is that Stripe splits one concept across two objects
// with opposite rules:
//
//   Product — long-lived and editable. Name, description and images can change
//             freely, and past purchases keep pointing at it.
//   Price   — IMMUTABLE. `unit_amount` can never be changed after creation.
//
// So "the admin raised the price" is not an update. It is: create a NEW Price,
// point the product row at it, and archive the old one. Archiving (rather than
// deleting) is essential — the old Price has to stay alive so historical
// invoices and receipts still resolve.

// `status` is optional because the database column has a default of "private",
// so an insert may legitimately omit it. Undefined therefore means private —
// and `status === "public"` already yields false for it, so the product is
// archived in Stripe, which is the safe direction.
// Stripe's tax classification for what this platform sells: on-demand online
// courses delivered as pre-recorded, streamed audio/video. It matches the
// YouTube-embedded lessons the courses are built from.
//
// This is REQUIRED, not decorative. Managed Payments is enabled by default on
// the account, which makes Stripe the merchant of record — it calculates and
// remits sales tax and VAT on our behalf, which is what makes selling into many
// countries tractable. It refuses to create a Checkout Session for a product
// with no tax code, so without this every purchase fails with
// "the product tax code is missing".
//
// If the business ever stops using Managed Payments, the alternative is passing
// `managed_payments: { enabled: false }` per Checkout Session — at which point
// tax obligations in every country sold into become ours to handle.
const ONLINE_COURSE_TAX_CODE = "txcd_20060158";

type ProductFields = {
    name: string;
    description: string;
    imageUrl: string;
    priceInDollars: number;
    status?: productStatus;
};

// Stripe fetches image URLs itself, so a relative path would mean nothing to
// it. Product images are already absolute UploadThing URLs; resolving against
// SERVER_URL leaves those untouched and repairs any local one.
function absoluteImageUrl(imageUrl: string) {
    return new URL(imageUrl, env.SERVER_URL).href;
}

// Creates the Stripe Product and its first Price. Called when a product is
// created in the admin.
export async function createStripeProduct(product: ProductFields) {
    const stripeProduct = await stripe.products.create({
        name: product.name,
        description: product.description,
        images: [absoluteImageUrl(product.imageUrl)],
        tax_code: ONLINE_COURSE_TAX_CODE,
        // A private product is archived in Stripe too, so it cannot be bought
        // even by someone who somehow reaches a checkout for it.
        active: product.status === "public",
    });

    const stripePrice = await stripe.prices.create({
        product: stripeProduct.id,
        currency: "usd",
        unit_amount: dollarsToCents(product.priceInDollars),
    });

    return { stripeProductId: stripeProduct.id, stripePriceId: stripePrice.id };
}

// Brings an existing Stripe Product back in line with our row, minting a
// replacement Price only when the amount actually changed.
export async function updateStripeProduct(
    product: ProductFields & {
        stripeProductId: string | null;
        stripePriceId: string | null;
    }
) {
    // Products that predate this sync — or whose earlier sync failed — have no
    // Stripe counterpart yet, so there is nothing to reconcile against and we
    // start from scratch.
    if (product.stripeProductId == null) {
        return createStripeProduct(product);
    }

    // Re-sent on every update so a product created before this tax code existed
    // is repaired the first time an admin saves it, rather than staying
    // unbuyable until someone notices.
    await stripe.products.update(product.stripeProductId, {
        name: product.name,
        description: product.description,
        images: [absoluteImageUrl(product.imageUrl)],
        tax_code: ONLINE_COURSE_TAX_CODE,
        active: product.status === "public",
    });

    const desiredAmount = dollarsToCents(product.priceInDollars);

    // Ask Stripe what the current Price actually is rather than comparing
    // against the old database value. Stripe is the side that bills, so a drift
    // between the two is exactly the case this needs to catch and repair.
    const currentPrice =
        product.stripePriceId == null
            ? null
            : await stripe.prices.retrieve(product.stripePriceId);

    if (currentPrice != null && currentPrice.unit_amount === desiredAmount) {
        return {
            stripeProductId: product.stripeProductId,
            stripePriceId: currentPrice.id,
        };
    }

    const newPrice = await stripe.prices.create({
        product: product.stripeProductId,
        currency: "usd",
        unit_amount: desiredAmount,
    });

    // Archive last, and only after the replacement exists. Doing it first would
    // leave a window where the product has no usable price at all.
    if (currentPrice != null) {
        await stripe.prices.update(currentPrice.id, { active: false });
    }

    return {
        stripeProductId: product.stripeProductId,
        stripePriceId: newPrice.id,
    };
}

// Deactivates a product in Stripe when it is removed here.
//
// Deliberately archives instead of deleting: Stripe refuses to delete a product
// that has any price history, and the records behind past purchases must
// survive anyway. Failures are swallowed because the local delete has already
// been decided — an unreachable Stripe should not block it, and a stale
// archived-or-not flag on an orphan product is harmless.
export async function archiveStripeProduct(stripeProductId: string | null) {
    if (stripeProductId == null) return;

    try {
        await stripe.products.update(stripeProductId, { active: false });
    } catch (error) {
        console.error(
            `[stripe] could not archive product ${stripeProductId}:`,
            error
        );
    }
}
