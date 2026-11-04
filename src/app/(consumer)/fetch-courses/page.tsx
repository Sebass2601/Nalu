import MultiLayerParallax from "@/components/ui/MultiLayerParallax";
import { HOTSPOTS, type Entrance } from "@/components/ui/parallaxEntrances";
import { CastleWelcomePopup } from "@/app/features/categories/components/CastleWelcomePopup";
import { Cinzel } from "next/font/google";
import { cacheTag } from "next/cache";
import { db } from "@/drizzle/db";
import { CategoryTable } from "@/drizzle/schema";
import { getCategoryGlobalTag } from "@/app/features/categories/db/cache/categories";
import { asc } from "drizzle-orm";

const cinzel = Cinzel({ subsets: ["latin"] });

// The castle: the page where a visitor picks what to look at, one plaque per
// category. It sat at `/` until the salon took that place. The salon's course
// doorway now goes straight to the catalogue, so this is reached from the navbar
// instead; the central entrance below still leads back to the salon.
//
// Doorways that are not categories at all: their wording and destination are
// fixed here, and the category assignment skips straight past them.
const FIXED_ENTRANCES: Record<string, { label: string; href: string }> = {
  // The great central entrance leads back to the salon at `/`, the page every
  // visitor arrives on, rather than to a category.
  "4": { label: "Gran Salón del Conocimiento", href: "/" },
};

export default async function FetchCourses() {
  const categories = await getCategories();

  return (
    <main className={cinzel.className}>
      <MultiLayerParallax
        background="/parallax/layer_1.webp"
        foreground="/parallax/layer_2.webp"
        entrances={assignEntrances(categories)}
      />
      {/* Tells a first-time visitor what the plaques are — a castle covered
          in signs gives no hint that each one is a category. Once per visit,
          after the artwork has loaded. */}
      <CastleWelcomePopup />
    </main>
  );
}

async function getCategories() {
  "use cache";
  cacheTag(getCategoryGlobalTag());

  return db
    .select({
      id: CategoryTable.id,
      name: CategoryTable.name,
      description: CategoryTable.description,
      doorway: CategoryTable.doorway,
    })
    .from(CategoryTable)
    .orderBy(asc(CategoryTable.name));
}

type Category = {
  id: string;
  name: string;
  description: string | null;
  doorway: string | null;
};

// Turns the categories into the plaques the castle draws. Each one goes to the
// doorway stored on it, and a category without a doorway is simply not drawn —
// it stays reachable from /products and the category nav.
//
// Nothing here depends on how many categories there are or on the order they
// arrive in, which is the point: a category's plaque only ever moves when an
// admin changes its doorway. Adding, renaming or deleting a category leaves
// every other plaque exactly where it was.
//
// A doorway pointing at nothing is left as plain artwork, and a category
// pointing at a doorway the artwork no longer has is dropped rather than drawn
// off-screen.
function assignEntrances(categories: Category[]): Entrance[] {
  const byDoorway = new Map(
    categories.flatMap((category) =>
      category.doorway == null ? [] : [[category.doorway, category] as const]
    )
  );

  // Each doorway carries its own place in the artwork, because the parallax
  // draws two different paintings now and keeps no table of its own.
  return HOTSPOTS.flatMap(({ id, x, y }) => {
    // A fixed doorway keeps its own wording and is never handed to a category.
    const fixed = FIXED_ENTRANCES[id];
    if (fixed) return [{ id, x, y, ...fixed }];

    const category = byDoorway.get(id);
    if (!category) return [];

    return [
      {
        id,
        x,
        y,
        label: category.name,
        href: `/categories/${category.id}`,
        // Trimmed, so a description that is nothing but spaces counts as no
        // description and the plaque is drawn plain. The fixed doorways above
        // never reach this line, which is what keeps the caption bar to
        // categories alone.
        caption: category.description?.trim() || undefined,
      },
    ];
  });
}
