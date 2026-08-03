import { CategoryNav } from "@/app/features/categories/components/CategoryNav";
import { ProductCard } from "./ProductCard";
import { Cinzel } from "next/font/google";

const cinzel = Cinzel({ subsets: ["latin"] });

// The shape every listing grid needs from a product row.
export type CatalogueProduct = {
    id: string;
    name: string;
    description: string;
    imageUrl: string;
    priceInDollars: number;
};

// The page frame shared by the full catalogue and every category page.
//
// The night-sky navy of the castle artwork, kept a shade lighter than the
// cards' own #0a1628 tint so the frosted panels still read as panels. The
// colour lives on the full-width element, not on the centred column, or it
// would stop at the column's edges on wide screens. min-h-screen keeps a short
// page from ending in a white band.
export function CatalogueShell({ children }: { children: React.ReactNode }) {
    return (
        <main
            className={`${cinzel.className} min-h-screen w-full bg-[#0a1628] bg-linear-to-b from-[#12243f] via-[#0d1c31] to-[#0a1628]`}
        >
            <div className="pt-32 px-4 max-w-6xl mx-auto pb-16">{children}</div>
        </main>
    );
}

// Nav, heading and the grid of cards. `current` is the plaque to light up: a
// category id, or "all" for the full catalogue.
export function Catalogue({
    current,
    title,
    description,
    products,
    emptyMessage,
}: {
    current: string;
    title: string;
    description?: string | null;
    products: CatalogueProduct[];
    emptyMessage: string;
}) {
    return (
        <>
            <CategoryNav current={current} />
            <h1 className="text-4xl tracking-widest text-gold mb-2 text-center">
                {title}
            </h1>
            {description && (
                <p className="text-base text-gold-body mb-8 text-center max-w-2xl mx-auto">
                    {description}
                </p>
            )}

            {products.length === 0 ? (
                <p className="mt-12 text-center text-gold-body">
                    {emptyMessage}
                </p>
            ) : (
                <div className="mt-8 grid grid-cols-[repeat(auto-fill,minmax(300px,1fr))] gap-6">
                    {products.map(product => (
                        <ProductCard key={product.id} {...product} />
                    ))}
                </div>
            )}
        </>
    );
}

// What stands in while a catalogue is still being read.
export function CatalogueSkeleton() {
    return (
        <div className="animate-pulse">
            <div className="mb-8 flex flex-wrap justify-center gap-2">
                {Array.from({ length: 5 }, (_, index) => (
                    <div
                        key={index}
                        className="h-7 w-32 rounded-full bg-yellow-200/10"
                    />
                ))}
            </div>
            <div className="h-8 w-64 mx-auto rounded bg-yellow-200/20" />
            <div className="mt-8 grid grid-cols-[repeat(auto-fill,minmax(300px,1fr))] gap-6">
                {Array.from({ length: 3 }, (_, index) => (
                    <div
                        key={index}
                        className="h-80 w-full max-w-125 mx-auto rounded-2xl border border-yellow-200/20 bg-[#0a1628]/40"
                    />
                ))}
            </div>
        </div>
    );
}
