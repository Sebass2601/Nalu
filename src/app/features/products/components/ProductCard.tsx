import { Suspense } from "react";
import Image from "next/image";
import { ProductPrice, FullPrice } from "./ProductPrice";
import { PlaqueButton } from "@/components/ui/PlaqueButton";
import { WeeklyContentTag } from "@/components/ui/WeeklyContentTag";

// One product as it appears in any listing grid: cover image, price, name,
// a clipped description and the button that opens it. Kept as a component so
// every grid (the full catalogue, each category page) shows the same card.
export function ProductCard({
    id,
    name,
    description,
    imageUrl,
    priceInDollars,
    uploadedWeekly,
}: {
    id: string;
    name: string;
    description: string;
    imageUrl: string;
    priceInDollars: number;
    // True when any course inside this product is still being uploaded weekly.
    uploadedWeekly: boolean;
}) {
    return (
        <div className="rounded-2xl border border-gold/40 bg-[#0a1628]/70 backdrop-blur-md overflow-hidden flex flex-col w-full max-w-125 mx-auto">
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
                {/* Full price streams instantly; the PPP-adjusted price
                    replaces it once the buyer's country resolves. Both carry
                    the same text size so the figure doesn't jump on swap. */}
                <Suspense
                    fallback={
                        <FullPrice
                            priceInDollars={priceInDollars}
                            className="text-2xl"
                        />
                    }
                >
                    <ProductPrice
                        priceInDollars={priceInDollars}
                        className="text-2xl"
                    />
                </Suspense>
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
