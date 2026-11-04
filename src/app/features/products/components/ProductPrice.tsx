import { Suspense } from "react";
import { connection } from "next/server";
import { formatPrice } from "@/lib/formatters";
import { cn } from "@/lib/utils";
import {
    displayPrice,
    priceDependsOnClock,
    type PromoPriceFields,
} from "../lib/promoOffer";

// Renders a product's price, striking through the original when a promotion is
// running.
//
// This used to apply Purchasing Power Parity, reading the buyer's country from
// a header the proxy stamped and looking up their country group's discount.
// That whole apparatus is gone: Hotmart offers regional pricing natively as a
// dashboard setting, and it is switched off precisely so this page and the
// checkout page always show the same number.
//
// What replaced it is simpler and honest. A promotion in Hotmart is a second
// offer on the same product, so "is there a discount" is a property of the
// product row rather than of the person looking at it.
//
// It takes the product's own price columns and decides for itself, through
// `displayPrice` — the same arithmetic `startCheckout` picks the offer with, so
// the figure drawn here and the offer the button opens cannot come apart.
//
// Almost always that needs nothing but the row, and the price is drawn as part
// of the static page. The one exception is a promotion with an end date: which
// side of the date we are on is a fact about the moment of the visit, so that
// price alone waits for the request and streams in behind a placeholder.
export function ProductPrice({
    product,
    className,
}: {
    product: PromoPriceFields;
    className?: string;
}) {
    if (priceDependsOnClock(product)) {
        return (
            <Suspense fallback={<PricePlaceholder className={className} />}>
                <DeadlinePrice product={product} className={className} />
            </Suspense>
        );
    }

    // No `now` passed, and none needed: without a deadline `displayPrice`
    // answers without consulting the clock.
    return <Price {...displayPrice(product)} className={className} />;
}

// The price of a product whose promotion ends on a date.
//
// `connection()` is what says "this cannot be decided ahead of time". Under
// Cache Components, reading the clock while a page is being prerendered is an
// error rather than a silent freeze — which is the right call, because the
// alternative is a page built at noon still advertising a sale that ended at
// midnight. Awaiting it defers this one component to the request.
async function DeadlinePrice({
    product,
    className,
}: {
    product: PromoPriceFields;
    className?: string;
}) {
    await connection();

    return <Price {...displayPrice(product, new Date())} className={className} />;
}

// The promotion's mark without the price: nothing a visitor sees, only the
// `data-promo` attribute a product card outlines itself by. For the listing
// cards, which stopped showing prices but still pick out what is on sale.
//
// Decided exactly as `ProductPrice` decides — the same `displayPrice`, and the
// same wait for the request when a promotion ends on a date — so a card is
// outlined in pumpkin precisely when its product page shows a struck-through
// price. Waiting draws nothing, so the outline eases in when the answer lands.
export function PromoMarker({ product }: { product: PromoPriceFields }) {
    if (priceDependsOnClock(product)) {
        return (
            <Suspense fallback={null}>
                <DeadlinePromoMarker product={product} />
            </Suspense>
        );
    }

    return <Marker {...displayPrice(product)} />;
}

async function DeadlinePromoMarker({ product }: { product: PromoPriceFields }) {
    await connection();

    return <Marker {...displayPrice(product, new Date())} />;
}

function Marker({ wasPriceInDollars }: { wasPriceInDollars: number | null }) {
    return wasPriceInDollars == null ? null : <span data-promo hidden />;
}

// Holds the price's place until it is known.
//
// A block of the price's own colour rather than the full price, which is what
// used to stand here. The full price is a number, and for the length of a
// request it would be the wrong one — shown to exactly the visitors who are
// about to be offered less.
//
// It carries the same text-size class as the price and a non-breaking space,
// so it is one line of that size tall and nothing below it moves when the real
// figure lands.
function PricePlaceholder({ className }: { className?: string }) {
    return (
        <span
            aria-hidden
            className={cn(
                "block w-24 animate-pulse rounded bg-gold/20 text-3xl",
                className
            )}
        >
            &nbsp;
        </span>
    );
}

function Price({
    priceInDollars,
    wasPriceInDollars,
    className,
}: {
    priceInDollars: number;
    // The pre-promotion price, or null when nothing is discounted.
    wasPriceInDollars: number | null;
    className?: string;
}) {
    if (wasPriceInDollars == null) {
        return (
            <span className={cn("text-3xl font-bold text-gold", className)}>
                {formatPrice(priceInDollars)}
            </span>
        );
    }

    return (
        // `data-promo` marks a price on promotion. The listing cards no longer
        // show a price and carry `PromoMarker` instead, which sets the same
        // attribute from the same `displayPrice` answer — see ProductCard.
        <div data-promo className="flex items-baseline gap-2.5">
            {/* Pumpkin, not gold: the one figure on the site that is. A price
                on promotion has to be told apart from every other price at a
                glance across a grid of cards, and a second shade of gold would
                not do that.

                The two hidden labels are for a screen reader, which would
                otherwise read two bare amounts in a row with nothing to say
                which of them is being charged. */}
            <span className={cn("text-3xl font-bold text-pumpkin", className)}>
                <span className="sr-only">Precio en promoción: </span>
                {formatPrice(priceInDollars)}
            </span>
            {/* The original stays the gold every other price is written in —
                it IS an ordinary price, just no longer the one in force — and
                dimmed so it recedes behind the figure actually being charged.

                Only the line through it is pumpkin. `text-decoration-color` is
                set apart from the text's own colour for exactly this: the
                stroke belongs to the promotion, the number under it does not.
                Two pixels, because at one a line the colour of the new price
                over a number the colour of the old one reads as a rendering
                fault rather than as crossing something out. */}
            <s className="text-base text-gold/60 decoration-pumpkin decoration-2">
                <span className="sr-only">Precio original: </span>
                {formatPrice(wasPriceInDollars)}
            </s>
        </div>
    );
}
