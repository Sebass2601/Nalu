import { formatPrice } from "@/lib/formatters";
import { cn } from "@/lib/utils";

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
// product row rather than of the person looking at it — which means this
// component is no longer dynamic and needs no Suspense boundary around it.
export function ProductPrice({
    priceInDollars,
    wasPriceInDollars,
    className,
}: {
    priceInDollars: number;
    // The pre-promotion price, or null when nothing is discounted. Comes from
    // `displayPrice` in ../lib/promoOffer, which owns the "is the promo live"
    // arithmetic so this component only has to render.
    wasPriceInDollars?: number | null;
    className?: string;
}) {
    if (wasPriceInDollars == null) {
        return <FullPrice priceInDollars={priceInDollars} className={className} />;
    }

    return (
        <div className="flex items-baseline gap-2">
            <span className={cn("text-3xl font-bold text-gold", className)}>
                {formatPrice(priceInDollars)}
            </span>
            {/* The same gold, dimmed. The struck-through original has to
                recede behind the price actually being charged, and dropping
                its opacity keeps that hierarchy without introducing a second
                colour into a pair of figures that are the same thing. */}
            <span className="text-base text-gold/60 line-through">
                {formatPrice(wasPriceInDollars)}
            </span>
        </div>
    );
}

// The undiscounted price on its own. Still exported separately because callers
// that already know there is no promotion should not have to pass a null.
export function FullPrice({
    priceInDollars,
    className,
}: {
    priceInDollars: number;
    className?: string;
}) {
    return (
        <span className={cn("text-3xl font-bold text-gold", className)}>
            {formatPrice(priceInDollars)}
        </span>
    );
}
