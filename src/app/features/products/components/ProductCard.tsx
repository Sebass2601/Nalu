import Image from "next/image";
import { PromoMarker } from "./ProductPrice";
import { PlaqueButton } from "@/components/ui/PlaqueButton";
import { WeeklyContentTag } from "@/components/ui/WeeklyContentTag";
import type { PromoPriceFields } from "../lib/promoOffer";

// One product as it appears in any listing grid: cover image, name, a clipped
// description and the button that opens it. Kept as a component so every grid
// (the full catalogue, each category page) shows the same card.
//
// No price. The card is a preview, and the price is shown on the product page
// the button opens, beside the button that charges it.
export function ProductCard({
    id,
    name,
    description,
    imageUrl,
    uploadedWeekly,
    // Everything else is the price: the base figure and the three promotion
    // columns. Not drawn, but still needed to know whether the product is on
    // sale — it is handed whole to `PromoMarker`, which decides that.
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
        // the discounted ones can be picked out of a grid — the only sign of
        // the sale on the card, now that it shows no price.
        //
        // The card does not work out for itself whether it is discounted. It
        // asks, in CSS, whether the marker inside it says so: `has-[[data-promo]]`
        // matches when `PromoMarker` has decided the product page would show
        // a struck-through price, and only then. That keeps the outline and
        // the product page from ever disagreeing — including for a promotion
        // with an end date, which is decided per visit and streams in a moment
        // after the card. The outline arrives with it, eased by the transition
        // rather than snapping from gold.
        //
        // A browser too old for `:has()` simply keeps the gold edge every card
        // has.
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
                {/* Invisible: only lights the pumpkin outline above. Draws its
                    own boundary in the one case that needs to wait for the
                    request, so none is needed here. */}
                <PromoMarker product={pricing} />
                {/* Gold, so the card reads in the site's own yellow under a
                    white title — the same pairing the product page uses for
                    its title and the line of counts beneath it. */}
                <p className="text-base text-gold line-clamp-3 flex-1">
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
