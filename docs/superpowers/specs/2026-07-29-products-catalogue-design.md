# Catálogo: /products redesign and the "Todos" tab

Date: 2026-07-29

## Problem

`/categories/[categoryId]` is the finished consumer template: Cinzel type, the
navy castle gradient, a row of category plaques, `ProductCard` grids and a
streaming skeleton. `/products` predates it — plain background, inline card
markup, no nav, no shared card component. The two pages show the same kind of
content and look unrelated.

There is also no way to see the whole catalogue from inside a category. A
visitor who opens "Torre del Tiempo" can move sideways to another category but
cannot get back to every course without editing the URL.

## Goals

1. `/products` looks and behaves like a category page.
2. A **Todos** plaque in the category nav switches between "every course" and a
   single category, from either page.
3. The shared frame lives in one file so the two pages cannot drift apart.

Non-goals: changing `ProductCard`, the PPP price streaming, cache tags, or the
home-page parallax.

## Design

### Shared catalogue frame

New file `src/app/features/products/components/ProductCatalogue.tsx`, holding
markup lifted verbatim from today's category page so that page's appearance
does not change:

- `CatalogueShell({ children })` — the Cinzel `<main>` carrying
  `min-h-screen w-full bg-[#0a1628]` and the `from-[#12243f] via-[#0d1c31]
  to-[#0a1628]` gradient, wrapping the `pt-28 px-4 max-w-6xl mx-auto pb-16`
  column. The colour stays on the full-width element, not the centred column,
  so it does not stop at the column's edges on wide screens.
- `Catalogue({ current, title, description, products, emptyMessage })` —
  renders `<CategoryNav current={current} />`, the gold `h1`, the optional
  centred description, then either `emptyMessage` or the
  `grid-cols-[repeat(auto-fill,minmax(300px,1fr))]` grid of `<ProductCard>`.
- `CatalogueSkeleton()` — the pulse skeleton, moved out of the category page.

`products` is typed as the props `ProductCard` already takes: `id`, `name`,
`description`, `imageUrl`, `priceInDollars`.

### The Todos plaque

`CategoryNav` renames its prop `currentCategoryId` → `current: string` and
prepends one plaque labelled `Todos` with `href="/products"`. It uses the same
`shared` / current / inactive class strings as the category plaques, including
the gold text-shadow on the current one.

The plaque is current when `current === "all"`; category pages pass their own
category id. So `/products` shows Todos in gold as plain text with
`aria-current="page"`, and every category page shows it as a dim link. The nav
keeps fetching its own category list, so neither page passes it data.

### /categories/[categoryId]

Data functions, cache tags and the `<Suspense>` boundary are unchanged — under
Cache Components `params` is request-time, so the fetches must stay inside the
boundary. Only the JSX changes: `CatalogueShell` wraps the page, the inner
component returns `<Catalogue current={category.id} title={category.name}
description={category.description} … />`, and the local `CategorySkeleton` is
deleted in favour of `CatalogueSkeleton`.

Empty message stays `Aún no hay cursos disponibles en esta categoría.`

### /products

Rebuilt on the same frame:

- Heading **Todos los cursos**, no description, `current="all"`.
- Empty message `Aún no hay cursos disponibles.`
- `getPublicProducts()` keeps its `"use cache"` + `getProductGlobalTag()` and
  its existing column selection; its ordering changes from
  `desc(createdAt)` to `asc(ProductTable.name)` so the ordering does not lurch
  when switching between Todos and a category.
- No `<Suspense>` boundary: the page takes no params and both its queries are
  `"use cache"` with no request-time input, so it renders fully cached. The
  per-card price `<Suspense>` inside `ProductCard` still handles the
  country-dependent PPP swap.

Inline card markup and the local `ProductPrice`/`FullPrice`/`Image` imports are
removed; the page uses `ProductCard` like the category page does.

## Risks

- `CategoryNav`'s prop rename touches its only current caller; a missed call
  site is a type error, not a silent bug.
- Next.js in this repo has breaking changes from common knowledge
  (`AGENTS.md`), so the relevant guide in `node_modules/next/dist/docs/` must
  be read before writing the page/caching code.

## Verification

- `pnpm build` succeeds.
- `/products` renders the gradient frame, Todos gold in the nav, alphabetical
  grid of public products.
- A category page is visually unchanged apart from the new leading Todos
  plaque, and clicking Todos lands on `/products`.
