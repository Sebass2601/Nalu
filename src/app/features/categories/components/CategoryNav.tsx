import Link from "next/link";
import { asc } from "drizzle-orm";
import { cacheTag } from "next/cache";
import { db } from "@/drizzle/db";
import { CategoryTable } from "@/drizzle/schema";
import { getCategoryGlobalTag } from "../db/cache/categories";

// Row of outlined plaques, one per category, so a visitor can move sideways
// between categories without going back to the castle. The category being
// viewed is rendered in full gold and as plain text rather than a link — there
// is nowhere to go from it — while the rest stay dim until hovered.
//
// It fetches its own list rather than taking one as a prop, so dropping it onto
// another page costs a single line.
export async function CategoryNav({
    currentCategoryId,
}: {
    currentCategoryId: string;
}) {
    const categories = await getCategories();

    return (
        <nav
            aria-label="Categorías"
            className="mb-8 flex flex-wrap justify-center gap-2"
        >
            {categories.map(category => {
                const isCurrent = category.id === currentCategoryId;

                const shared =
                    "rounded-full border px-4 py-1.5 text-xs tracking-widest uppercase transition-colors";

                return isCurrent ? (
                    <span
                        key={category.id}
                        aria-current="page"
                        className={`${shared} border-yellow-200 bg-yellow-200/10 text-yellow-200`}
                        style={{ textShadow: "0 0 12px rgba(254,240,138,0.35)" }}
                    >
                        {category.name}
                    </span>
                ) : (
                    <Link
                        key={category.id}
                        href={`/categories/${category.id}`}
                        className={`${shared} border-yellow-200/25 text-yellow-200/60 hover:border-yellow-200/70 hover:text-yellow-100`}
                    >
                        {category.name}
                    </Link>
                );
            })}
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
