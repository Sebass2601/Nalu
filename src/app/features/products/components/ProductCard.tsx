import Image from "next/image";
import { ProductPrice } from "./ProductPrice";
import { PlaqueButton } from "@/components/ui/PlaqueButton";
import { WeeklyContentTag } from "@/components/ui/WeeklyContentTag";
import type { PromoPriceFields } from "../lib/promoOffer";

// One product as it appears in any listing grid: cover image, price, name,
// a clipped description and the button that opens it. Kept as a component so
// every grid (the full catalogue, each category page) shows the same card.
export function ProductCard({
    id,
    name,
    description,
    imageUrl,
    uploadedWeekly,
    // Everything else is the price: the base figure and the three promotion
    // columns. Gathered rather than named one by one because this card has no
    // opinion on any of them — it hands the set to `ProductPrice`, which does.
    ...pricing
}: {
    id: string;
    name: string;
    description: string;
    imageUrl: string;
    // True when any course inside this product is still being uploaded weekly.
    uploadedWeekly: boolean;
} & PromoPriceFields) {
    return (
        // A card on promotion is outlined in the promotion's own colour, so
        // the discounted ones can be picked out of a grid before a single
        // price has been read.
        //
        // The card does not work out for itself whether it is discounted. It
        // asks, in CSS, whether the price inside it says so: `has-[[data-promo]]`
        // matches when `ProductPrice` has drawn a struck-through original, and
        // only then. That keeps the outline and the price from ever
        // disagreeing — including for a promotion with an end date, whose
        // price is decided per visit and streams in a moment after the card.
        // The outline arrives with it, eased by the transition rather than
        // snapping from gold.
        //
        // A browser too old for `:has()` simply keeps the gold edge every card
        // has. The price still shows the discount; only the outline is lost.
        <div className="rounded-2xl border border-gold/40 bg-[#0a1628]/70 backdrop-blur-md overflow-hidden flex flex-col w-full max-w-125 mx-auto transition-[border-color,box-shadow] duration-500 has-[[data-promo]]:border-pumpkin has-[[data-promo]]:shadow-[0_0_26px_rgba(255,117,24,0.22)]">
            <div className="relative aspect-video w-full">
                <Image
                    src={imageUrl}
                    alt={name}
                    fill
                    className="object-cover"
                />

                {/* In the cover's lower-right rather than the card's, which is
                    where the button is. The cover is empty in every card, so the
                    tag never covers anything that has to be read or pressed. */}
                {uploadedWeekly && (
                    <WeeklyContentTag className="absolute right-2 bottom-2" />
                )}
            </div>
            <div className="p-5 flex flex-col gap-3 flex-1">
                <h2 className="text-xl tracking-wide text-ink-bright">
                    {name}
                </h2>
                {/* The promotional price with the original struck through
                    when a promotion is running, the plain price when not.
                    `ProductPrice` draws its own boundary in the one case that
                    needs to wait for the request, so none is needed here. */}
                <ProductPrice product={pricing} className="text-2xl" />
                <p className="text-base text-ink-body line-clamp-3 flex-1">
                    {description}
                </p>
                <PlaqueButton
                    href={`/products/${id}`}
                    className="mt-2 block w-full"
                    size="sm"
                >
                    Ver curso
                </PlaqueButton>
            </div>
        </div>
    );
}
