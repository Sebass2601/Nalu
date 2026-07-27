import { formatPrice } from "@/lib/formatters";
import { cn } from "@/lib/utils";
import { getUserCoupon } from "@/app/features/countryGroups/lib/getUserCoupon";
import { getDiscountedPriceInDollars } from "../lib/ppp";

// Server component that renders a product's price with Purchasing Power Parity
// applied. It reads the buyer's country (stamped by proxy.ts from Arcjet
// geolocation) and, if their country group has a recommended discount, shows
// the local price alongside the struck-through original plus a PPP badge.
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
        <div className="flex flex-col gap-1">
            <div className="flex items-baseline gap-2">
                <span
                    className={cn(
                        "text-2xl font-semibold text-yellow-200",
                        className
                    )}
                >
                    {formatPrice(discounted)}
                </span>
                <span className="text-sm text-yellow-200/50 line-through">
                    {formatPrice(priceInDollars)}
                </span>
            </div>
            <span className="text-xs tracking-wide text-yellow-200/80">
                🌍 {coupon.discountPercentage * 100}% off · Purchasing Power
                Parity ({coupon.countryGroupName})
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
            className={cn("text-2xl font-semibold text-yellow-200", className)}
        >
            {formatPrice(priceInDollars)}
        </span>
    );
}
