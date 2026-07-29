# Subscription course rows: category carousels on /subscription and /subscribe

Date: 2026-07-29

## Problem

`/subscription` is a narrow `max-w-2xl` column holding a plan panel and a "Ver
cursos" link, and then it stops. Everything below the panel is empty navy. The
one page a paying subscriber returns to says nothing about what their money
unlocks.

Meanwhile `/subscribe` already lists the included courses — as a flat,
alphabetical, image-less `<ul>` of every course in the plan, ungrouped. It
answers "what is in this?" only in the most literal sense: a wall of names with
no structure, no art, and no sense of what kind of thing each course is.

Both pages want the same thing and neither has it: the subscription library,
grouped so it can be browsed.

## Goals

1. A band of horizontally-scrolling course rows, one row per category, rendered
   below the plan panel on `/subscription`.
2. The same band replaces the flat list on `/subscribe`, so one component and
   one query serve both pages.
3. Each row header links to a page listing that category's included courses in
   full.

Non-goals: per-user progress of any kind (no bars, no "continue watching"), any
change to purchasing, PPP pricing, `ProductCard`, or the access rules in
`getMyCourses`.

## Design

### What the rows contain

Courses where `CourseTable.includedInSubscription = true`, and nothing else.
This is the same flag `/subscribe`'s existing `getSubscriptionCourses()` reads
and the same one the access check uses, so the band can never show a subscriber
something they cannot open.

Cards carry no price and no purchase CTA. The visitor on `/subscription` has
already paid; the visitor on `/subscribe` is being shown the contents of an
offer, not a shelf of separate things to buy. A card links to
`/courses/[courseId]`.

### Grouping and ordering

One row per category holding at least one included course. A category whose
courses are all outside the plan produces no row at all — an empty row would
advertise a heading that leads nowhere.

`CourseTable.categoryId` is nullable, so included courses with no category are
collected into a final row headed **Otros cursos**. Nothing inside the plan is
allowed to be invisible: an admin who flags a course for the subscription and
forgets to categorise it must still see it ship.

Named categories come first in alphabetical order, matching `CategoryNav`.
**Otros cursos** is always last.

### The row

A `<section>` per row, labelled by its own header via `aria-labelledby`:

- Header left: category name, gold Cinzel, matching the existing `h2` scale.
- Header right: a **Ver todos** link, shown on every row regardless of card
  count. A conditional would make the header jitter between rows for no gain.
- Below: `flex` strip in an `overflow-x-auto snap-x snap-mandatory` container,
  cards `snap-start`, each `w-60` (240px) and `shrink-0`.

No client JavaScript. Scroll-snap handles touch, trackpad and shift-scroll. The
strip is the affordance: the next card is deliberately cut off by the container
edge, which is what tells a visitor the row continues.

A scrollable region is not reachable by keyboard unless it is focusable, so each
strip takes `tabIndex={0}` and an accessible name from the same header. This is
the price of the no-JS choice and it is one attribute.

Each row renders at most **12** cards. Past that, "Ver todos" is the way
through; a row is a sampler, not a catalogue.

### The card

`SubscriptionCourseCard` — a new component, not a reuse of `ProductCard` (which
carries price and a buy button) or `MyCourseCard` (which carries progress and
assumes ownership).

Structure follows `ProductCard` and `MyCourseCard`: a full-bleed `aspect-video`
cover flush to the card's top edge, padding on the text block below, corners
rounded by the card's own `overflow-hidden`.

- Cover: `next/image` when `imageUrl` is set.
- Name: `text-yellow-100`, clamped to two lines so cards stay level.
- Meta: `4 secciones · 12 lecciones`, built with `formatPlural` from
  `@/lib/formatters` in the exact wording `MyCourseCard` already uses.

No description. At 240px a clipped description is three lines of grey mush.

#### Missing cover art

`MyCourseCard` deliberately renders *nothing* where a course has no image,
arguing that a mixed shelf beats "a placeholder that says nothing". That
reasoning holds for a wrapping grid; it does not survive a horizontal strip,
where an image-less card is half the height of its neighbours and the row's
baseline visibly breaks.

Resolution: the cover block is always present at `aspect-video`, and when there
is no image it holds **the course name set as type** — Cinzel, gold, centred on
the navy gradient with a gold hairline. This is a typographic cover, not a
placeholder: it carries the same information a cover carries, so the objection
in `MyCourseCard` does not apply to it. `MyCourseCard` itself is left unchanged.

### Page layout

Both pages keep their existing narrow column and gain the band as a **sibling
element below it**, rather than the band trying to escape a container:

- `/subscription`: plan panel stays in `max-w-2xl`; band sits in `max-w-6xl`,
  matching `CatalogueShell`.
- `/subscribe`: plans and heading stay in `max-w-4xl`; band sits in `max-w-6xl`.

On `/subscribe` the band replaces the `IncludedCourses` component entirely. Two
things from it are preserved: the zero-state line `Aún no hay cursos incluidos
en la suscripción.`, and the trailing link `Ver también los cursos disponibles
para compra individual` to `/products`. The `N cursos incluidos` count heading
is dropped — the category headers now do that job better.

On `/subscription` the band renders under a quiet section label consistent with
the page's existing `tracking-[0.3em] uppercase` eyebrow style, and the existing
"Ver cursos" link is kept.

The band is a separate `<Suspense>` boundary from the plan panel on
`/subscription`. The panel is per-user and request-time; the band is not, and
must not be made to wait on it.

### "Ver todos" pages

`/subscribe/categories/[categoryId]` — public, no auth guard. It shows what an
offer contains, which is exactly what a prospective subscriber should be able to
read, and it sits under the public sales page rather than under the member-only
`/subscription`.

Rendered inside `CatalogueShell` as a plain wrapping grid of the same
`SubscriptionCourseCard` at the catalogue's usual
`grid-cols-[repeat(auto-fill,minmax(240px,1fr))]`, headed by the category name
and its description where it has one.

The **Otros cursos** row points at `/subscribe/categories/uncategorized`.
`uncategorized` is a literal sentinel, safe because category ids are uuids —
the same trick `CategoryNav` already plays with `"all"`.

The heading itself comes from a separate lookup, not from the course query: the
page reads the category row for its `name` and `description` the same way
`/categories/[categoryId]` does, tagged `getCategoryIdTag(id)`. For the
`uncategorized` sentinel there is no row to read, so the page hardcodes the
heading **Otros cursos** with no description.

`notFound()` when the id is neither the sentinel nor an existing category. A
real category with no included courses renders the zero-state message, not a
404: the category exists, it is simply not in the plan yet.

`params` is request-time under Cache Components, so everything depending on it
lives inside a `<Suspense>` boundary, as `/categories/[categoryId]` already
does.

### Data

New file `src/app/features/courses/db/subscriptionCourses.ts`, exporting:

```ts
export type SubscriptionCourse = {
    id: string;
    name: string;
    imageUrl: string | null;
    sectionCount: number;
    lessonCount: number;
};

export type SubscriptionCategoryRow = {
    // null for the uncategorized row.
    categoryId: string | null;
    categoryName: string;
    courses: SubscriptionCourse[];
};

export function getSubscriptionCourseRows(): Promise<SubscriptionCategoryRow[]>;
export function getSubscriptionCoursesByCategory(
    categoryId: string | null
): Promise<SubscriptionCourse[]>;
```

`getSubscriptionCourseRows` selects included courses left-joined to
`CategoryTable` — left, so uncategorized courses survive the join — then groups
in JS into rows, sorts named categories alphabetically and appends the
uncategorized row last.

Section and lesson counts come from one grouped aggregate over the visible
course ids, reusing the pattern in `getMyCourses`: `count(distinct section.id)`
because the join multiplies a section by its lessons, filtered to
`CourseSectionTable.status = "public"` and `LessonTable.status in ("public",
"preview")` so unpublished material is never counted into a card's promise. A
course with no published lessons yields no aggregate row and shows `0 secciones
· 0 lecciones`.

`getSubscriptionCoursesByCategory` takes `null` for the sentinel and filters on
`categoryId IS NULL`, otherwise `categoryId = $1`. It shares the same counts
helper.

Both are `"use cache"` and take no per-user input, so one cached result serves
every visitor, signed in or not. Tags: `getCourseGlobalTag`,
`getCategoryGlobalTag`, `getCourseSectionGlobalTag`, `getLessonGlobalTag` — an
admin toggling `includedInSubscription`, renaming a category, or publishing a
lesson all change what these rows say.

### Files

New:

- `src/app/features/courses/db/subscriptionCourses.ts`
- `src/app/features/courses/components/SubscriptionCourseCard.tsx`
- `src/app/features/courses/components/SubscriptionCourseRows.tsx` — the band,
  its rows, and its skeleton
- `src/app/(consumer)/subscribe/categories/[categoryId]/page.tsx`

Edited:

- `src/app/(consumer)/subscription/page.tsx` — band added below the panel
- `src/app/(consumer)/subscribe/page.tsx` — `IncludedCourses` and its local
  `getSubscriptionCourses` deleted, band added

## Risks

- Next.js in this repo has breaking changes from common knowledge
  (`AGENTS.md`). The relevant guides in `node_modules/next/dist/docs/` on
  caching, `"use cache"`/`cacheTag` and Suspense must be read before writing any
  of this — the caching design above is load-bearing and assumed, not verified.
- Deleting `IncludedCourses` touches a page in the paid funnel. `/subscribe`
  must be checked signed-out, signed-in without a subscription, and signed-in
  with one (which redirects to `/subscription`).
- The typographic cover contradicts a documented decision in `MyCourseCard`.
  Reasoning is in that section; if rejected, the fallback is image-less cards of
  reduced height and an uneven row baseline.

## Verification

- `pnpm build` succeeds.
- `/subscription` shows the plan panel unchanged, with category rows below it;
  rows scroll horizontally by touch and by shift-scroll, and a card is visibly
  cut off at the right edge.
- Tabbing reaches each strip and the arrow keys scroll it.
- `/subscribe` shows the same rows in place of the flat list, and still shows
  the `/products` link below them.
- A course with `includedInSubscription = true` and no category appears under
  **Otros cursos**; its "Ver todos" reaches
  `/subscribe/categories/uncategorized`.
- A category with no included courses produces no row.
- A course with no `imageUrl` renders a full-height typographic cover and sits
  level with its neighbours.
- `/subscribe/categories/<bad-uuid>` 404s; a real category with nothing in the
  plan shows the zero-state message.
