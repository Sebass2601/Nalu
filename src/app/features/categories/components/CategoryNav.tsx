import Link from "next/link";
import { asc } from "drizzle-orm";
import { cacheTag } from "next/cache";
import { db } from "@/drizzle/db";
import { CategoryTable } from "@/drizzle/schema";
import { getCategoryGlobalTag } from "../db/cache/categories";

// Row of outlined plaques so a visitor can move sideways between categories,
// and back out to the whole catalogue, without going back to the castle. The
// plaque being viewed is rendered in full gold and as plain text rather than a
// link — there is nowhere to go from it — while the rest stay dim until
// hovered.
//
// It fetches its own list rather than taking one as a prop, so dropping it onto
// another page costs a single line.
//
// `current` is the id of the category on screen, or "all" on the full
// catalogue at /products. Category ids are uuids, so "all" can never collide
// with one.
export async function CategoryNav({ current }: { current: string }) {
    const categories = await getCategories();

    const shared =
        "rounded-full border px-4 py-1.5 text-xs tracking-widest uppercase transition-colors";

    // The catalogue leads the row, then the categories in alphabetical order.
    const plaques = [
        { id: "all", name: "Todos", href: "/products" },
        ...categories.map(category => ({
            id: category.id,
            name: category.name,
            href: `/categories/${category.id}`,
        })),
    ];

    return (
        <nav
            aria-label="Categorías"
            className="mb-8 flex flex-wrap justify-center gap-2"
        >
            {plaques.map(plaque =>
                plaque.id === current ? (
                    <span
                        key={plaque.id}
                        aria-current="page"
                        className={`${shared} border-yellow-200 bg-yellow-200/10 text-yellow-200`}
                        style={{ textShadow: "0 0 12px rgba(254,240,138,0.35)" }}
                    >
                        {plaque.name}
                    </span>
                ) : (
                    <Link
                        key={plaque.id}
                        href={plaque.href}
                        className={`${shared} border-yellow-200/25 text-yellow-200/60 hover:border-yellow-200/70 hover:text-yellow-100`}
                    >
                        {plaque.name}
                    </Link>
                )
            )}
        </nav>
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
