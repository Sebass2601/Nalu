import { CategoryNav } from "@/app/features/categories/components/CategoryNav";
import { ProductCard } from "./ProductCard";
import { DraggableStrip } from "@/components/ui/DraggableStrip";
import { Cinzel } from "next/font/google";
import { CarvedBackdrop } from "@/components/ui/CarvedBackdrop";

const cinzel = Cinzel({ subsets: ["latin"] });

// The shape every listing grid needs from a product row.
export type CatalogueProduct = {
    id: string;
    name: string;
    description: string;
    imageUrl: string;
    priceInDollars: number;
    // True when any course inside this product is still being uploaded weekly.
    // Derived by the queries rather than stored on the product — see
    // `productHasWeeklyCourse`.
    uploadedWeekly: boolean;
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
            className={`${cinzel.className} relative min-h-screen w-full`}
        >
            <CarvedBackdrop />

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
            <h1 className="text-4xl tracking-widest text-ink mb-2 text-center">
                {title}
            </h1>
            {description && (
                <p className="text-base text-ink-body mb-8 text-center max-w-2xl mx-auto">
                    {description}
                </p>
            )}

            {products.length === 0 ? (
                <p className="mt-12 text-center text-ink-body">
                    {emptyMessage}
                </p>
            ) : (
                <>
                    {/* Phone: a column scrolled downwards, inside a box the
                        strip caps so it stays a window onto the catalogue
                        rather than becoming the page. Down rather than
                        sideways because the page already scrolls that way, and
                        asking for a sideways swipe in the middle of it is a
                        second gesture to discover.

                        It does not loop — this is every product in the
                        category, and the bottom of the column is the answer to
                        "how many are there". Reaching it also hands the scroll
                        back to the page, which is what keeps the footer
                        within reach of a finger that started on a card. */}
                    <div className="mt-8 lg:hidden">
                        <DraggableStrip
                            label="Cursos"
                            orientation="vertical"
                            previousLabel="Ver cursos anteriores"
                            nextLabel="Ver más cursos"
                        >
                            {products.map(product => (
                                // The full width of the column now that the
                                // cards are stacked: there is no next card to
                                // leave showing past the edge, because the one
                                // below already does that job. The order is
                                // the query's — name-ascending — and the
                                // column opens on the first of them.
                                <div
                                    key={product.id}
                                    className="w-full shrink-0 snap-start"
                                >
                                    <ProductCard {...product} />
                                </div>
                            ))}
                        </DraggableStrip>
                    </div>

                    {/* Wide screens keep the grid: the cards are the page
                        here, and there is room to lay them out in full. */}
                    <div className="mt-8 hidden grid-cols-[repeat(auto-fill,minmax(300px,1fr))] gap-6 lg:grid">
                        {products.map(product => (
                            <ProductCard key={product.id} {...product} />
                        ))}
                    </div>
                </>
            )}
        </>
    );
}

// What stands in while a catalogue is still being read.
//
// It mirrors `Catalogue` above rather than approximating it: the same two
// layouts at the same breakpoint, so nothing rearranges underneath the reader
// when the real cards arrive. A single grid here was a desktop-only fallback —
// on a phone it collapsed to one column of tall boxes, which is not what
// replaced it, and the swap moved the whole page.
//
// The phone column is plain markup rather than a DraggableStrip: the strip
// measures itself and parks its scroll position on mount, and there is no
// reason to mount, hydrate and measure a client component for cards that are
// about to be thrown away. It only has to *look* like the strip at rest, which
// is a column clipped at the box's bottom edge.
export function CatalogueSkeleton() {
    return (
        <div className="animate-pulse">
            {/* Phone: plaques running off the right edge, left-aligned and at
                the taller size CategoryNav gives them there. Uneven widths
                because "Todos" is a short word standing next to category
                names — a row of five identical pills reads as a placeholder
                for something else. */}
            <nav className="mb-6 flex gap-2 overflow-hidden px-1 pb-2 lg:hidden">
                {["w-28", "w-64", "w-48"].map(width => (
                    <div
                        key={width}
                        className={`h-12 shrink-0 rounded-full bg-gold/10 ${width}`}
                    />
                ))}
            </nav>

            {/* Wide screens: the wrapped, centred row. */}
            <nav className="mb-8 hidden flex-wrap justify-center gap-2 lg:flex">
                {Array.from({ length: 5 }, (_, index) => (
                    <div
                        key={index}
                        className="h-10 w-40 rounded-full bg-gold/10"
                    />
                ))}
            </nav>

            <div className="mx-auto h-8 w-64 rounded bg-gold/20" />

            {/* The column the strip becomes, at the height it caps itself
                to, so the card clipped by the bottom edge — the thing that
                says this column keeps going — is there before the products
                are. */}
            <div className="mt-8 flex max-h-[70vh] flex-col gap-4 overflow-hidden px-1 py-1 lg:hidden">
                {Array.from({ length: 3 }, (_, index) => (
                    <div key={index} className="w-full shrink-0">
                        <ProductCardSkeleton />
                    </div>
                ))}
            </div>

            <div className="mt-8 hidden grid-cols-[repeat(auto-fill,minmax(300px,1fr))] gap-6 lg:grid">
                {Array.from({ length: 3 }, (_, index) => (
                    <ProductCardSkeleton key={index} />
                ))}
            </div>
        </div>
    );
}

// A ProductCard with nothing in it yet, built from the same blocks in the same
// order: the full-bleed cover, then the padded stack. Built that way rather
// than given a fixed height because the height then follows the card's own at
// every width, instead of being a number that quietly stops matching the first
// time the card changes.
function ProductCardSkeleton() {
    return (
        <div className="mx-auto flex w-full max-w-125 flex-col overflow-hidden rounded-2xl border border-gold/40 bg-[#0a1628]/70">
            <div className="aspect-video w-full bg-gold/10" />
            <div className="flex flex-1 flex-col gap-3 p-5">
                {/* Two lines for the title: these names run long enough to
                    wrap on a card this wide, and the pair is spaced as two
                    lines of one heading rather than as two separate things. */}
                <div className="space-y-2">
                    <div className="h-6 w-full rounded bg-gold/20" />
                    <div className="h-6 w-2/3 rounded bg-gold/20" />
                </div>
                <div className="h-8 w-24 rounded bg-gold/20" />
                {/* Three lines, the most the description ever shows before
                    `line-clamp-3` cuts it. */}
                <div className="flex-1 space-y-3">
                    <div className="h-4 w-full rounded bg-gold/10" />
                    <div className="h-4 w-full rounded bg-gold/10" />
                    <div className="h-4 w-3/4 rounded bg-gold/10" />
                </div>
                <div className="mt-2 h-9 w-full rounded bg-gold/20" />
            </div>
        </div>
    );
}
