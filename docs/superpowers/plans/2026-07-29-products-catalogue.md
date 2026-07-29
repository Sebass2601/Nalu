# Products Catalogue Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `/products` look and behave like a category page, and add a "Todos" plaque to the category nav that switches between the full catalogue and one category.

**Architecture:** The finished look already exists in `src/app/(consumer)/categories/[categoryId]/page.tsx`. Task 1 adds the Todos plaque to `CategoryNav`. Task 2 lifts the page frame (gradient `<main>`, heading, product grid, skeleton) into one shared component file and puts the category page on it. Task 3 rebuilds `/products` on the same component. Each task leaves the app compiling and browsable.

**Tech Stack:** Next.js 16.2.9 App Router with `cacheComponents: true` (see `next.config.ts`), React 19, Tailwind v4, Drizzle ORM on Postgres, `next/font` Cinzel.

## Global Constraints

- **This is NOT the Next.js you know** (`AGENTS.md`). Before writing page or caching code, read `node_modules/next/dist/docs/01-app/03-api-reference/01-directives/use-cache.md` and `node_modules/next/dist/docs/01-app/03-api-reference/04-functions/cacheTag.md`. Heed deprecation notices.
- **There is no test framework in this repo.** `package.json` has no test script and no test dependencies. Do not add one. The verification cycle for every task is: `pnpm exec tsc --noEmit`, then `pnpm lint`, then a browser check on `pnpm dev`.
- **Package manager is pnpm**, never npm.
- **All user-facing copy is Spanish**, with accents: `Todos`, `Todos los cursos`, `Aún no hay cursos disponibles.`, `Aún no hay cursos disponibles en esta categoría.`
- **Do not touch** `ProductCard.tsx`, `ProductPrice.tsx`, the cache-tag helpers, the Drizzle schema, or the home-page parallax.
- **Cache tags stay as they are:** `getCategoryGlobalTag()` on the nav query, `getProductGlobalTag()` on the products query, `getProductGlobalTag(), getCourseGlobalTag()` on the category-products query, `getCategoryIdTag(id)` on the single-category query.
- **Commit after every task**, one commit per task, no co-author trailer beyond the repo's convention.

**Before starting, make sure the app runs:** the Postgres in `docker-compose.yml` must be up and `.env` present, otherwise pages that query the database will error in dev.

---

### Task 1: Add the "Todos" plaque to CategoryNav

**Files:**
- Modify: `src/app/features/categories/components/CategoryNav.tsx` (whole component body, lines 15-54)
- Modify: `src/app/(consumer)/categories/[categoryId]/page.tsx:65` (the one call site)
- Test: none — no test framework in this repo (see Global Constraints)

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces: `CategoryNav({ current }: { current: string })` — an async server component. `current` is a category id, or the literal string `"all"` when the full catalogue is being shown. Tasks 2 and 3 both pass this prop.

- [ ] **Step 1: Read the caching docs named in Global Constraints**

`CategoryNav` calls a `"use cache"` function. Read the two files listed above before editing so the directive and `cacheTag` usage are not changed by accident.

- [ ] **Step 2: Rewrite CategoryNav with the Todos plaque**

Replace the whole of `src/app/features/categories/components/CategoryNav.tsx` with this. The `getCategories` function at the bottom is unchanged — same query, same cache tag.

```tsx
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
```

- [ ] **Step 3: Update the one call site**

In `src/app/(consumer)/categories/[categoryId]/page.tsx`, change line 65 from `<CategoryNav currentCategoryId={category.id} />` to:

```tsx
<CategoryNav current={category.id} />
```

- [ ] **Step 4: Verify it type-checks and lints**

```bash
pnpm exec tsc --noEmit
pnpm lint
```

Expected: both clean. A `Property 'currentCategoryId' does not exist` error means Step 3 was missed.

- [ ] **Step 5: Verify in the browser**

Run `pnpm dev`, open any category page (from the home page, click a doorway). Expected: the plaque row now starts with a dim **TODOS** plaque followed by the categories; the current category is still gold; clicking TODOS goes to `/products` (still the old unstyled page — that is Task 3).

- [ ] **Step 6: Commit**

```bash
git add src/app/features/categories/components/CategoryNav.tsx src/app/\(consumer\)/categories/\[categoryId\]/page.tsx
git commit -m "feat: add Todos plaque to the category nav"
```

---

### Task 2: Extract the shared catalogue frame

**Files:**
- Create: `src/app/features/products/components/ProductCatalogue.tsx`
- Modify: `src/app/(consumer)/categories/[categoryId]/page.tsx` (imports, the JSX of `CategoryPage` and `CategoryProducts`, delete the local `CategorySkeleton`; the data functions `getCategory` and `getCategoryProducts` stay exactly as they are)
- Test: none — no test framework in this repo

**Interfaces:**
- Consumes: `CategoryNav({ current }: { current: string })` from Task 1.
- Produces, all from `@/app/features/products/components/ProductCatalogue`:
  - `type CatalogueProduct = { id: string; name: string; description: string; imageUrl: string; priceInDollars: number }`
  - `CatalogueShell({ children }: { children: React.ReactNode })`
  - `Catalogue({ current, title, description, products, emptyMessage }: { current: string; title: string; description?: string | null; products: CatalogueProduct[]; emptyMessage: string })`
  - `CatalogueSkeleton()`

  Task 3 uses `CatalogueShell` and `Catalogue`.

- [ ] **Step 1: Create the shared frame component**

Create `src/app/features/products/components/ProductCatalogue.tsx`. Every class string below is copied from the current category page so that page's appearance does not change.

```tsx
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
            <div className="pt-28 px-4 max-w-6xl mx-auto pb-16">{children}</div>
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
            <h1 className="text-3xl tracking-widest text-yellow-200 mb-2 text-center">
                {title}
            </h1>
            {description && (
                <p className="text-sm text-yellow-200/70 mb-8 text-center max-w-2xl mx-auto">
                    {description}
                </p>
            )}

            {products.length === 0 ? (
                <p className="mt-12 text-center text-yellow-200/70">
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
```

- [ ] **Step 2: Put the category page on the shared frame**

In `src/app/(consumer)/categories/[categoryId]/page.tsx`, replace everything from the top of the file down to the end of the local `CategorySkeleton` function (line 113) with the block below. **Leave `getCategory` and `getCategoryProducts` at the bottom of the file untouched** — same queries, same `cacheTag` calls.

```tsx
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { and, asc, eq } from "drizzle-orm";
import { cacheTag } from "next/cache";
import { db } from "@/drizzle/db";
import {
    CategoryTable,
    CourseProductTable,
    CourseTable,
    ProductTable,
} from "@/drizzle/schema";
import { getCategoryIdTag } from "@/app/features/categories/db/cache/categories";
import { getProductGlobalTag } from "@/app/features/products/db/cache/products";
import { getCourseGlobalTag } from "@/app/features/courses/db/cache/courses";
import {
    Catalogue,
    CatalogueShell,
    CatalogueSkeleton,
} from "@/app/features/products/components/ProductCatalogue";

// One page serving every category: the doorway clicked on the home page decides
// which id lands in the URL, and the same template renders that category's
// products.
//
// Under Cache Components `params` is only known at request time, so everything
// that depends on it lives inside the <Suspense> boundary below. That lets the
// frame render immediately while the products stream in.
export default function CategoryPage({
    params,
}: {
    params: Promise<{ categoryId: string }>;
}) {
    return (
        <CatalogueShell>
            <Suspense fallback={<CatalogueSkeleton />}>
                <CategoryProducts params={params} />
            </Suspense>
        </CatalogueShell>
    );
}

async function CategoryProducts({
    params,
}: {
    params: Promise<{ categoryId: string }>;
}) {
    const { categoryId } = await params;
    const category = await getCategory(categoryId);

    if (category == null) return notFound();

    const products = await getCategoryProducts(categoryId);

    return (
        <Catalogue
            current={category.id}
            title={category.name}
            description={category.description}
            products={products}
            emptyMessage="Aún no hay cursos disponibles en esta categoría."
        />
    );
}
```

Note the imports that are gone: `Cinzel`, `CategoryNav`, `ProductCard`. `CategoryTable`, `CourseProductTable`, `CourseTable`, `ProductTable`, `and`, `asc`, `eq`, `cacheTag` and `db` are all still used by the two data functions left at the bottom.

- [ ] **Step 3: Verify it type-checks and lints**

```bash
pnpm exec tsc --noEmit
pnpm lint
```

Expected: both clean. Unused-import warnings from `pnpm lint` mean Step 2's import list was not applied exactly.

- [ ] **Step 4: Verify the category page is unchanged in the browser**

Run `pnpm dev` and open a category page. Expected: identical to Task 1's result — same gradient, same gold heading and description, same card grid, TODOS plaque still leading the nav. Also open a category with no products and confirm the line `Aún no hay cursos disponibles en esta categoría.` still appears.

- [ ] **Step 5: Commit**

```bash
git add src/app/features/products/components/ProductCatalogue.tsx src/app/\(consumer\)/categories/\[categoryId\]/page.tsx
git commit -m "refactor: extract the shared catalogue frame"
```

---

### Task 3: Rebuild /products on the catalogue frame

**Files:**
- Modify: `src/app/(consumer)/products/page.tsx` (whole file)
- Test: none — no test framework in this repo

**Interfaces:**
- Consumes: `CatalogueShell` and `Catalogue` from Task 2, `CatalogueProduct` implicitly via the query's column selection.
- Produces: nothing other tasks depend on.

- [ ] **Step 1: Replace the products page**

Replace the whole of `src/app/(consumer)/products/page.tsx` with:

```tsx
import { eq } from "drizzle-orm";
import { cacheTag } from "next/cache";
import { db } from "@/drizzle/db";
import { ProductTable } from "@/drizzle/schema";
import { getProductGlobalTag } from "@/app/features/products/db/cache/products";
import {
    Catalogue,
    CatalogueShell,
} from "@/app/features/products/components/ProductCatalogue";

// The whole catalogue, reached from the Todos plaque on any category page.
//
// No <Suspense> boundary here: this page takes no params and its queries are
// all "use cache" with no request-time input, so it prerenders whole. The
// per-card price still streams inside ProductCard.
export default async function ProductsPage() {
    const products = await getPublicProducts();

    return (
        <CatalogueShell>
            <Catalogue
                current="all"
                title="Todos los cursos"
                products={products}
                emptyMessage="Aún no hay cursos disponibles."
            />
        </CatalogueShell>
    );
}

// Public products only, cached under the shared product tag so admin edits
// refresh this list. Sorted by name to match the category pages, so the order
// does not lurch when switching between plaques.
async function getPublicProducts() {
    "use cache";
    cacheTag(getProductGlobalTag());

    return db.query.ProductTable.findMany({
        where: eq(ProductTable.status, "public"),
        columns: {
            id: true,
            name: true,
            description: true,
            imageUrl: true,
            priceInDollars: true,
        },
        orderBy: (products, { asc }) => asc(products.name),
    });
}
```

- [ ] **Step 2: Verify it type-checks and lints**

```bash
pnpm exec tsc --noEmit
pnpm lint
```

Expected: both clean.

- [ ] **Step 3: Verify the new page in the browser**

Run `pnpm dev` and open `/products`. Expected:
- Navy gradient background running the full height, Cinzel type.
- Plaque row with **TODOS** gold and non-clickable, every category dim and clickable.
- Heading `Todos los cursos`.
- Every public course as a `ProductCard` (image, price, clipped description, "Ver curso" button), alphabetical, in the same responsive grid as a category page.
- Clicking a category plaque lands on that category; the plaque row does not shift position between the two pages.
- Clicking "Ver curso" still opens `/products/[productId]`.

- [ ] **Step 4: Verify the production build**

Postgres from `docker-compose.yml` must be running — this build prerenders the cached queries.

```bash
pnpm build
```

Expected: build succeeds with no type or prerender errors.

- [ ] **Step 5: Commit**

```bash
git add src/app/\(consumer\)/products/page.tsx
git commit -m "feat: rebuild /products on the catalogue frame"
```

---

## Self-Review Notes

Spec coverage: shared frame → Task 2; Todos plaque and `current` prop → Task 1; category page refactor with data functions untouched → Task 2; `/products` heading, empty message, `asc(name)` ordering and no Suspense → Task 3; verification (`pnpm build` + visual) → Task 3 Steps 3-4. The spec's TDD-shaped steps are replaced by type-check/lint/browser checks because the repo has no test framework.
