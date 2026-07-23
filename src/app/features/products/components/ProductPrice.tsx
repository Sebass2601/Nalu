import { formatPrice } from "@/lib/formatters";
import { getUserCountry } from "@/lib/getUserCountry";
import { getUserPPPDiscount } from "@/app/features/countryGroups/db/countryGroups";
import { getDiscountedPriceInDollars } from "../lib/ppp";

// Server component that renders a product's price with Purchasing Power Parity
// applied. It reads the buyer's country (stamped by proxy.ts from Arcjet
// geolocation) and, if their country group has a recommended discount, shows
// the local price alongside the struck-through original plus a PPP badge.
//
// Reading the country header makes this component dynamic, so render it inside a
// <Suspense> boundary (see `PriceFallback` for the full-price placeholder that
// streams instantly under Cache Components).
export async function ProductPrice({
    priceInDollars,
}: {
    priceInDollars: number;
}) {
    const country = await getUserCountry();
    const discount = country ? await getUserPPPDiscount(country) : null;

    // No country or no discount for their group → just the full price.
    if (discount == null) {
        return <FullPrice priceInDollars={priceInDollars} />;
    }

    const discounted = getDiscountedPriceInDollars(
        priceInDollars,
        discount.discountPercentage
    );

    return (
        <div className="flex flex-col gap-1">
            <div className="flex items-baseline gap-2">
                <span className="text-2xl font-semibold text-yellow-200">
                    {formatPrice(discounted)}
                </span>
                <span className="text-sm text-yellow-200/50 line-through">
                    {formatPrice(priceInDollars)}
                </span>
            </div>
            <span className="text-xs tracking-wide text-yellow-200/80">
                🌍 {Math.round(discount.discountPercentage * 100)}% off ·
                Purchasing Power Parity ({discount.countryGroupName})
            </span>
        </div>
    );
}

// The non-discounted price, also used as the Suspense fallback so the full
// price is visible instantly while the PPP-adjusted version streams in.
export function FullPrice({ priceInDollars }: { priceInDollars: number }) {
    return (
        <span className="text-2xl font-semibold text-yellow-200">
            {formatPrice(priceInDollars)}
        </span>
    );
}
