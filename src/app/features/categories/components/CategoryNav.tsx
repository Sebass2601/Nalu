import Link from "next/link";
import { asc } from "drizzle-orm";
import { cacheTag } from "next/cache";
import { db } from "@/drizzle/db";
import { CategoryTable } from "@/drizzle/schema";
import { getCategoryGlobalTag } from "../db/cache/categories";
import { DraggableStrip } from "@/components/ui/DraggableStrip";

// Row of outlined plaques so a visitor can move sideways between categories,
// and back out to the whole catalogue, without going back to the castle. The
// plaque being viewed is lit to full white and marked `aria-current`, while the
// rest stay dim until hovered.
//
// The letters are white and the outlines stayed gold. This row sits above the
// catalogue as part of the page rather than in the bar at the top, so it reads
// with the page; the gold border and fill are what still tie it to the navbars.
//
// It fetches its own list rather than taking one as a prop, so dropping it onto
// another page costs a single line.
//
// Two layouts, one set of plaques: a draggable strip on a phone and the wrapped
// row on wide screens. See the comments beside each below.
//
// `current` is the id of the category on screen, or "all" on the full
// catalogue at /products. Category ids are uuids, so "all" can never collide
// with one.
export async function CategoryNav({ current }: { current: string }) {
    const categories = await getCategories();

    // `tracking-wide` rather than the `tracking-widest` these carried while they
    // were small: letter-spacing that size buys legibility, but at this size it
    // only pulls the words apart. `whitespace-nowrap` because a longer category
    // name breaking across two lines would make its plaque twice the height of
    // every other one in the row.
    // A step larger on a phone than on a wide screen, which is the opposite of
    // the usual direction and deliberate: on a phone these are a strip you drag
    // and tap, so they are both a target and the only navigation on screen,
    // while on a wide screen the whole set sits above the catalogue at once and
    // does not need to shout.
    const shared =
        "rounded-full border px-6 py-3 text-base tracking-wide whitespace-nowrap uppercase transition-colors lg:px-5 lg:py-2.5 lg:text-sm";

    // The catalogue leads the row, then the categories in alphabetical order.
    const plaques = [
        { id: "all", name: "Todos", href: "/products" },
        ...categories.map(category => ({
            id: category.id,
            name: category.name,
            href: `/categories/${category.id}`,
        })),
    ];

    // The same plaques in both layouts below, so the two can never drift into
    // saying different things about which category is open.
    const items = plaques.map(plaque =>
        plaque.id === current ? (
            <span
                key={plaque.id}
                aria-current="page"
                className={`${shared} shrink-0 snap-start border-gold bg-gold/10 text-ink-bright`}
                style={{ textShadow: "0 0 12px rgba(255,255,255,0.35)" }}
            >
                {plaque.name}
            </span>
        ) : (
            <Link
                key={plaque.id}
                href={plaque.href}
                // Brighter at rest than the /60 these sat at while they were
                // small text — an unselected category is still something you
                // are meant to be able to read across the row, and the filled
                // border plus the glow is what marks the current one, not the
                // others being dimmed to the edge of legibility.
                className={`${shared} shrink-0 snap-start border-gold/40 text-ink-body hover:border-gold/80 hover:text-ink-bright`}
            >
                {plaque.name}
            </Link>
        )
    );

    return (
        <>
            {/* Phone: one row that is dragged and swiped sideways, the same
                strip the subscription rows use, minus their loop: this is the
                whole set of categories, and running off the end back to
                "Todos" would hide the fact that you had seen them all.
                Wrapping instead would spend
                three or four lines of a small screen on navigation before the
                catalogue itself begins — and the plaques are a list you move
                along, which is what a strip looks like.

                `mb-6` rather than the wrapped row's `mb-8`: the strip carries
                its own `pb-2` for the scrollbar area, so the gap below it
                would otherwise read as larger than the one on wide screens. */}
            <nav aria-label="Categorías" className="mb-6 lg:hidden">
                {/* Choosing a category sends the row back to its beginning,
                    and `current` changing is what tells it one was chosen. The
                    row is navigation rather than content — it is read from the
                    left, and leaving it parked wherever the last choice was
                    made hides the categories nearest the start behind a scroll
                    nobody asked for. */}
                <DraggableStrip
                    label="Categorías"
                    previousLabel="Ver categorías anteriores"
                    nextLabel="Ver más categorías"
                    rewindOn={current}
                    gapClassName="gap-2"
                >
                    {items}
                </DraggableStrip>
            </nav>

            {/* Wide screens keep the wrapped, centred row: there is room for
                every plaque at once, and seeing the whole set is worth more
                than the sideways movement. */}
            <nav
                aria-label="Categorías"
                className="mb-8 hidden flex-wrap justify-center gap-2 lg:flex"
            >
                {items}
            </nav>
        </>
    );
}

async function getCategories() {
    "use cache";
    cacheTag(getCategoryGlobalTag());

    return db
        .select({ id: CategoryTable.id, name: CategoryTable.name })
        .from(CategoryTable)
        .orderBy(asc(CategoryTable.name));
}
