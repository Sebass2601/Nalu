import { Suspense } from "react";
import Image from "next/image";
import Link from "next/link";
import { ProductPrice, FullPrice } from "./ProductPrice";

// One product as it appears in any listing grid: cover image, price, name,
// a clipped description and the button that opens it. Kept as a component so
// every grid (the full catalogue, each category page) shows the same card.
export function ProductCard({
    id,
    name,
    description,
    imageUrl,
    priceInDollars,
}: {
    id: string;
    name: string;
    description: string;
    imageUrl: string;
    priceInDollars: number;
}) {
    return (
        <div className="rounded-2xl border border-yellow-200/40 bg-[#0a1628]/70 backdrop-blur-md overflow-hidden flex flex-col w-full max-w-125 mx-auto">
            <div className="relative aspect-video w-full">
                <Image
                    src={imageUrl}
                    alt={name}
                    fill
                    className="object-cover"
                />
            </div>
            <div className="p-5 flex flex-col gap-3 flex-1">
                <h2 className="text-lg tracking-wide text-yellow-100">
                    {name}
                </h2>
                {/* Full price streams instantly; the PPP-adjusted price
                    replaces it once the buyer's country resolves. Both carry
                    the same text size so the figure doesn't jump on swap. */}
                <Suspense
                    fallback={
                        <FullPrice
                            priceInDollars={priceInDollars}
                            className="text-xl"
                        />
                    }
                >
                    <ProductPrice
                        priceInDollars={priceInDollars}
                        className="text-xl"
                    />
                </Suspense>
                <p className="text-sm text-yellow-200/70 line-clamp-3 flex-1">
                    {description}
                </p>
                <Link
                    href={`/products/${id}`}
                    className="mt-2 block rounded-lg border border-yellow-200/60 px-4 py-2 text-center text-sm tracking-widest text-yellow-200 uppercase transition-colors hover:bg-yellow-200 hover:text-[#0a1628]"
                >
                    Ver curso
                </Link>
            </div>
        </div>
    );
}
