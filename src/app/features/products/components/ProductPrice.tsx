import { formatPrice } from "@/lib/formatters";
import { cn } from "@/lib/utils";
import { getUserCoupon } from "@/app/features/countryGroups/lib/getUserCoupon";
import { getDiscountedPriceInDollars } from "../lib/ppp";

// Server component that renders a product's price with Purchasing Power Parity
// applied. It reads the buyer's country (stamped by proxy.ts from Arcjet
// geolocation) and, if their country group has a recommended discount, shows
// the local price alongside the struck-through original. The discount is shown
// as the two prices only — deliberately unlabelled, so the page never names the
// buyer's region back to them.
//
// Reading the country header makes this component dynamic, so render it inside a
// <Suspense> boundary (see `PriceFallback` for the full-price placeholder that
// streams instantly under Cache Components).
//
// `className` restyles the price figure itself — pass a text size here and the
// same one to the <Suspense> fallback, or the number visibly resizes when the
// discounted price streams in.
export async function ProductPrice({
    priceInDollars,
    className,
}: {
    priceInDollars: number;
    className?: string;
}) {
    const coupon = await getUserCoupon();

    // No country, no discount for their group, or no Stripe coupon backing it →
    // just the full price. That last case matters: showing a discount we cannot
    // actually apply at checkout would quote one price and charge another.
    if (coupon == null) {
        return (
            <FullPrice
                priceInDollars={priceInDollars}
                className={className}
            />
        );
    }

    const discounted = getDiscountedPriceInDollars(
        priceInDollars,
        coupon.discountPercentage
    );

    return (
        <div className="flex items-baseline gap-2">
            <span
                className={cn(
                    "text-3xl font-bold text-gold",
                    className
                )}
            >
                {formatPrice(discounted)}
            </span>
            {/* The same gold, dimmed. The struck-through original has to
                recede behind the price actually being charged, and dropping
                its opacity keeps that hierarchy without introducing a second
                colour into a pair of figures that are the same thing. */}
            <span className="text-base text-gold/60 line-through">
                {formatPrice(priceInDollars)}
            </span>
        </div>
    );
}

// The non-discounted price, also used as the Suspense fallback so the full
// price is visible instantly while the PPP-adjusted version streams in.
export function FullPrice({
    priceInDollars,
    className,
}: {
    priceInDollars: number;
    className?: string;
}) {
    return (
        <span
            className={cn("text-3xl font-bold text-gold", className)}
        >
            {formatPrice(priceInDollars)}
        </span>
    );
}
