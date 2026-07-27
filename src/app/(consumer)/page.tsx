import MultiLayerParallax from "@/components/ui/MultiLayerParallax";
import { HOTSPOTS, type Entrance } from "@/components/ui/parallaxEntrances";
import { Cinzel } from "next/font/google";
import { cacheTag } from "next/cache";
import { db } from "@/drizzle/db";
import { CategoryTable } from "@/drizzle/schema";
import { getCategoryGlobalTag } from "@/app/features/categories/db/cache/categories";
import { asc } from "drizzle-orm";

const cinzel = Cinzel({ subsets: ["latin"] });

// Doorways that are not categories at all: their wording and destination are
// fixed here, and the category assignment skips straight past them.
const FIXED_ENTRANCES: Record<string, { label: string; href: string }> = {
  // The great central entrance leads to its own page rather than a category.
  "4": { label: "Gran Salón del Conocimiento", href: "/" },
};

// Categories that must appear at one particular doorway, keyed by the doorway's
// id in HOTSPOTS. They are matched by category id rather than by name, so
// renaming a category in the admin panel never moves it off its doorway.
// Every category left out of this list fills whatever doorways remain.
const PINNED_CATEGORIES: Record<string, string> = {
  // "Torre del Tiempo" → the archway beneath the clock tower.
  "2": "910db7e6-b0f7-4148-9f03-e02dca7286d7",
  // "Templo de los Espejos" → the mid-left lit window.
  "3": "b6bb2614-39e4-43cc-9796-4e3602805e6f",
  // "El Reino Escondido" → the lower left archway.
  "9": "0f077991-d335-46f2-86c1-4bca3e4cea37",
};

// Wording for a doorway's button, keyed by doorway id. A doorway listed here
// keeps this exact text no matter what its category is later renamed to; a
// doorway left out simply shows its category's current name.
const LABEL_OVERRIDES: Record<string, string> = {
  // "2": "Torre del Tiempo",
};

export default async function Home() {
  const categories = await getCategories();

  return (
    <main className={cinzel.className}>
      <MultiLayerParallax entrances={assignEntrances(categories)} />
    </main>
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

type Category = { id: string; name: string };

// Fills every doorway: the fixed ones keep their own wording, the pinned
// category takes the doorway it was assigned, and the rest are handed out in
// alphabetical order. Doorways with no category left over are dropped rather
// than rendered as a button that leads nowhere.
function assignEntrances(categories: Category[]): Entrance[] {
  const byId = new Map(categories.map((category) => [category.id, category]));
  const pinnedIds = new Set(Object.values(PINNED_CATEGORIES).filter(Boolean));
  const unpinned = categories.filter((category) => !pinnedIds.has(category.id));

  return HOTSPOTS.flatMap(({ id }) => {
    // A fixed doorway stands on its own and leaves the pool untouched.
    const fixed = FIXED_ENTRANCES[id];
    if (fixed) return [{ id, ...fixed }];

    const pinned = byId.get(PINNED_CATEGORIES[id] ?? "");
    // shift() takes the next spare category and removes it from the pool, so
    // no two doorways can end up with the same one.
    const category = pinned ?? unpinned.shift();
    if (!category) return [];

    return [
      {
        id,
        label: LABEL_OVERRIDES[id] ?? category.name,
        href: `/categories/${category.id}`,
      },
    ];
  });
}
