# Subscription Course Rows Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the empty space below the plan panel on `/subscription`, and the flat course list on `/subscribe`, with category-grouped horizontally-scrolling rows of the courses the subscription includes.

**Architecture:** One cached query groups `includedInSubscription` courses by category into rows. One card component and one rows component render those rows on both pages. Each row header links to a new public per-category grid page. No client JavaScript: scrolling is CSS scroll-snap.

**Tech Stack:** Next.js 16.2.9 (App Router, Cache Components), React 19.2.4, Drizzle ORM, Tailwind v4, TypeScript.

Spec: `docs/superpowers/specs/2026-07-29-subscription-course-rows-design.md`

## Global Constraints

- **This is not stock Next.js.** Per `AGENTS.md`, read the relevant guide in `node_modules/next/dist/docs/` before writing code that touches an unfamiliar API. Already verified for this plan: `cacheComponents: true` is set in `next.config.ts`; `"use cache"` is a function-body directive; `cacheTag(...)` is imported from `next/cache` and accepts multiple string tags.
- **There is no test framework in this repo.** No vitest, jest, or playwright in `package.json`; zero `*.test.*` files exist. Do NOT add one — it is outside this plan's scope. Every task's verification is instead: `pnpm lint`, `pnpm build` (which runs the full TypeScript check), and the named manual browser checks. Treat those browser checks as the test suite: run every one before committing.
- **Package manager is `pnpm`, never `npm`.**
- **Indentation is 4 spaces**, matching every file under `src/app/`.
- **All user-facing copy is Spanish.** Route segments and identifiers stay English.
- **Fonts:** import `cinzel` from `@/components/ui/fonts`. Do not re-instantiate `Cinzel()` in new files.
- **Palette:** navy `#0a1628`, gradient `from-[#12243f] via-[#0d1c31] to-[#0a1628]`, gold `yellow-200` / `yellow-100`. Tailwind v4 gradient syntax is `bg-linear-to-*`, not `bg-gradient-to-*`.
- **Cache tag helpers** live in `src/app/features/*/db/cache/*.ts` and are called, never inlined as strings: `getCourseGlobalTag()`, `getCategoryGlobalTag()`, `getCategoryIdTag(id)`, `getCourseSectionGlobalTag()`, `getLessonGlobalTag()`.
- **Published-content filter**, used anywhere lessons are counted: `CourseSectionTable.status = "public"` and `LessonTable.status IN ("public", "preview")`.
- **The uncategorized sentinel is the literal string `uncategorized`** in URLs, and `null` in code. Safe because category ids are uuids.
- **Row card cap is 12.**

---

### Task 1: Subscription courses data layer

**Files:**
- Create: `src/app/features/courses/db/subscriptionCourses.ts`
- Reference (read for the aggregate pattern, do not modify): `src/app/features/courses/db/myCourses.ts:150-200`

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces:
  - `type SubscriptionCourse = { id: string; name: string; imageUrl: string | null; sectionCount: number; lessonCount: number }`
  - `type SubscriptionCategoryRow = { categoryId: string | null; categoryName: string; courses: SubscriptionCourse[] }`
  - `const UNCATEGORIZED_ROW_NAME: string` (value `"Otros cursos"`)
  - `getSubscriptionCourseRows(): Promise<SubscriptionCategoryRow[]>`
  - `getSubscriptionCoursesByCategory(categoryId: string | null): Promise<SubscriptionCourse[]>`

- [ ] **Step 1: Create the file with types and the shared counts helper**

Create `src/app/features/courses/db/subscriptionCourses.ts`:

```ts
import "server-only";

import { and, asc, count, eq, inArray, isNull, sql } from "drizzle-orm";
import { cacheTag } from "next/cache";
import { db } from "@/drizzle/db";
import {
    CategoryTable,
    CourseSectionTable,
    CourseTable,
    LessonTable,
} from "@/drizzle/schema";
import { getCourseGlobalTag } from "./cache/courses";
import { getCategoryGlobalTag } from "@/app/features/categories/db/cache/categories";
import { getCourseSectionGlobalTag } from "@/app/features/CourseSections/db/cache/courseSections";
import { getLessonGlobalTag } from "@/app/features/lessons/db/cache/lessons";

// One course as it appears in a subscription row. No price and no progress:
// these cards are shown to people who already have access, or who are being
// told what an offer contains, so neither figure means anything here.
export type SubscriptionCourse = {
    id: string;
    name: string;
    imageUrl: string | null;
    sectionCount: number;
    lessonCount: number;
};

// One row of the band. `categoryId` is null for the catch-all row.
export type SubscriptionCategoryRow = {
    categoryId: string | null;
    categoryName: string;
    courses: SubscriptionCourse[];
};

// Heading for included courses that were never given a category. They get a row
// rather than being dropped: nothing inside the plan is allowed to be
// invisible, or an admin who flags a course and forgets to categorise it ships
// nothing and never finds out.
export const UNCATEGORIZED_ROW_NAME = "Otros cursos";

// Published sections and lessons per course, in one grouped pass.
//
// `count(distinct section.id)` because the join multiplies a section by each of
// its lessons. Unpublished material is filtered out on both sides: a card must
// not promise lessons nobody can open.
//
// Not itself cached — every caller is already inside a `"use cache"` scope, and
// caching on an array argument would key an entry per distinct id list.
async function getCourseCounts(courseIds: string[]) {
    const rows = await db
        .select({
            courseId: CourseSectionTable.courseId,
            sectionCount: sql<number>`count(distinct ${CourseSectionTable.id})::int`,
            lessonCount: count(LessonTable.id),
        })
        .from(CourseSectionTable)
        .innerJoin(
            LessonTable,
            and(
                eq(LessonTable.sectionId, CourseSectionTable.id),
                inArray(LessonTable.status, ["public", "preview"])
            )
        )
        .where(
            and(
                inArray(CourseSectionTable.courseId, courseIds),
                eq(CourseSectionTable.status, "public")
            )
        )
        .groupBy(CourseSectionTable.courseId);

    return new Map(
        rows.map(row => [
            row.courseId,
            { sectionCount: row.sectionCount, lessonCount: row.lessonCount },
        ])
    );
}
```

- [ ] **Step 2: Add `getSubscriptionCourseRows`**

Append to the same file:

```ts
// Every course in the subscription, grouped into one row per category.
//
// Nothing here depends on who is asking, so a single cache entry serves every
// visitor — subscriber, prospect or signed out. The four tags cover every edit
// that can change what these rows say: flagging a course into or out of the
// plan, renaming a category, and publishing a section or a lesson (which moves
// the counts on a card).
export async function getSubscriptionCourseRows(): Promise<
    SubscriptionCategoryRow[]
> {
    "use cache";
    cacheTag(
        getCourseGlobalTag(),
        getCategoryGlobalTag(),
        getCourseSectionGlobalTag(),
        getLessonGlobalTag()
    );

    // Left, not inner: a course with no category still belongs in the band,
    // and an inner join would silently drop it.
    const rows = await db
        .select({
            id: CourseTable.id,
            name: CourseTable.name,
            imageUrl: CourseTable.imageUrl,
            categoryId: CategoryTable.id,
            categoryName: CategoryTable.name,
        })
        .from(CourseTable)
        .leftJoin(CategoryTable, eq(CategoryTable.id, CourseTable.categoryId))
        .where(eq(CourseTable.includedInSubscription, true))
        .orderBy(asc(CourseTable.name));

    if (rows.length === 0) return [];

    const counts = await getCourseCounts(rows.map(row => row.id));

    // Grouped in JS rather than SQL: the query already returns courses in name
    // order, so pushing in sequence keeps each row alphabetical for free.
    const named = new Map<string, SubscriptionCategoryRow>();
    const uncategorized: SubscriptionCourse[] = [];

    for (const row of rows) {
        const course: SubscriptionCourse = {
            id: row.id,
            name: row.name,
            imageUrl: row.imageUrl,
            sectionCount: counts.get(row.id)?.sectionCount ?? 0,
            lessonCount: counts.get(row.id)?.lessonCount ?? 0,
        };

        if (row.categoryId == null || row.categoryName == null) {
            uncategorized.push(course);
            continue;
        }

        const existing = named.get(row.categoryId);
        if (existing == null) {
            named.set(row.categoryId, {
                categoryId: row.categoryId,
                categoryName: row.categoryName,
                courses: [course],
            });
        } else {
            existing.courses.push(course);
        }
    }

    // `localeCompare` with "es" so accented names sort where a Spanish reader
    // expects, which a raw byte sort would not do.
    const result = [...named.values()].sort((a, b) =>
        a.categoryName.localeCompare(b.categoryName, "es")
    );

    // Always last, whatever it is called alphabetically.
    if (uncategorized.length > 0) {
        result.push({
            categoryId: null,
            categoryName: UNCATEGORIZED_ROW_NAME,
            courses: uncategorized,
        });
    }

    return result;
}
```

- [ ] **Step 3: Add `getSubscriptionCoursesByCategory`**

Append to the same file:

```ts
// Every included course in one category, for that category's "Ver todos" page.
// `null` means the uncategorized catch-all.
//
// No category tag here, unlike the rows query: this one never reads
// `CategoryTable`, so a rename cannot change its result. The page that shows
// the heading reads the category itself and tags that read separately.
export async function getSubscriptionCoursesByCategory(
    categoryId: string | null
): Promise<SubscriptionCourse[]> {
    "use cache";
    cacheTag(
        getCourseGlobalTag(),
        getCourseSectionGlobalTag(),
        getLessonGlobalTag()
    );

    const rows = await db
        .select({
            id: CourseTable.id,
            name: CourseTable.name,
            imageUrl: CourseTable.imageUrl,
        })
        .from(CourseTable)
        .where(
            and(
                eq(CourseTable.includedInSubscription, true),
                categoryId == null
                    ? isNull(CourseTable.categoryId)
                    : eq(CourseTable.categoryId, categoryId)
            )
        )
        .orderBy(asc(CourseTable.name));

    if (rows.length === 0) return [];

    const counts = await getCourseCounts(rows.map(row => row.id));

    return rows.map(row => ({
        ...row,
        sectionCount: counts.get(row.id)?.sectionCount ?? 0,
        lessonCount: counts.get(row.id)?.lessonCount ?? 0,
    }));
}
```

- [ ] **Step 4: Verify it compiles and type-checks**

Run: `pnpm lint`
Expected: no errors for `subscriptionCourses.ts`.

Run: `pnpm build`
Expected: build succeeds. Nothing imports this file yet, but `next build` type-checks the whole project, so any wrong column name, bad tag import path, or type mismatch fails here.

If `pnpm build` reports an unused-import error for anything in the import block, the code above is wrong — every import listed is used. Fix the usage, do not delete the import.

- [ ] **Step 5: Commit**

```bash
git add src/app/features/courses/db/subscriptionCourses.ts
git commit -m "feat: query subscription courses grouped by category"
```

---

### Task 2: The subscription course card

**Files:**
- Create: `src/app/features/courses/components/SubscriptionCourseCard.tsx`
- Reference (read for structure, do not modify): `src/app/features/courses/components/MyCourseCard.tsx`

**Interfaces:**
- Consumes: `SubscriptionCourse` from `../db/subscriptionCourses` (Task 1).
- Produces: `SubscriptionCourseCard({ course }: { course: SubscriptionCourse })`.

Two deliberate differences from the existing cards, both required by the 240px width — do not "fix" them to match:

1. **The whole card is the `<Link>`**, not a button inside a div. `ProductCard` and `MyCourseCard` end with a "Ver curso" button; at 240px that button costs a fifth of the card's height to say what the card already says.
2. **A course with no image gets a typographic cover.** `MyCourseCard` deliberately renders nothing there, arguing a placeholder "says nothing" — true for a wrapping grid, false for a horizontal strip where a short card visibly breaks the row's baseline. The cover carries the course *name*, so it is a cover, not a placeholder. Leave `MyCourseCard` alone.

- [ ] **Step 1: Write the component**

Create `src/app/features/courses/components/SubscriptionCourseCard.tsx`:

```tsx
import Image from "next/image";
import Link from "next/link";
import { formatPlural } from "@/lib/formatters";
import type { SubscriptionCourse } from "../db/subscriptionCourses";

// One course inside the subscription band, and on the per-category pages.
//
// No price and no progress bar. Whoever is looking either has access already or
// is reading what an offer contains, and in neither case is a figure the point.
//
// The whole card is the link rather than carrying a button, because at this
// width a button costs a fifth of the card to repeat what the card says.
// `h-full` lets the card fill a stretched grid or flex track, so a long name
// never leaves its neighbours short.
export function SubscriptionCourseCard({
    course,
}: {
    course: SubscriptionCourse;
}) {
    return (
        <Link
            href={`/courses/${course.id}`}
            className="flex h-full flex-col overflow-hidden rounded-2xl border border-yellow-200/40 bg-[#0a1628]/70 backdrop-blur-md transition-colors hover:border-yellow-200/80"
        >
            {/* Always present, image or not, so every card in a row is the
                same height and the strip keeps one baseline. */}
            <div className="relative aspect-video w-full">
                {course.imageUrl ? (
                    <Image
                        src={course.imageUrl}
                        alt={course.name}
                        fill
                        className="object-cover"
                    />
                ) : (
                    <TypographicCover name={course.name} />
                )}
            </div>

            <div className="flex flex-1 flex-col gap-2 p-4">
                {/* Clamped so a three-line name cannot push the meta line out
                    of alignment with the cards beside it. */}
                <h3 className="line-clamp-2 text-sm tracking-wide text-yellow-100">
                    {course.name}
                </h3>

                <p className="mt-auto text-xs tracking-widest text-yellow-200/50 uppercase">
                    {formatPlural(course.sectionCount, {
                        singular: "sección",
                        plural: "secciones",
                    })}{" "}
                    ·{" "}
                    {formatPlural(course.lessonCount, {
                        singular: "lección",
                        plural: "lecciones",
                    })}
                </p>
            </div>
        </Link>
    );
}

// The cover for a course with no artwork: its own name, set as type on the
// navy gradient. Not a stand-in for a missing picture — it carries the same
// thing a cover carries, which is why it is worth the space.
function TypographicCover({ name }: { name: string }) {
    return (
        <div className="flex h-full w-full items-center justify-center bg-linear-to-br from-[#16294a] via-[#0f1f38] to-[#0a1628] p-4">
            <span className="line-clamp-3 text-center text-xs tracking-[0.2em] text-yellow-200/80 uppercase">
                {name}
            </span>
        </div>
    );
}
```

- [ ] **Step 2: Verify**

Run: `pnpm lint`
Expected: clean.

Run: `pnpm build`
Expected: succeeds. This confirms the `SubscriptionCourse` type import from Task 1 resolves and every field used exists on it.

- [ ] **Step 3: Commit**

```bash
git add src/app/features/courses/components/SubscriptionCourseCard.tsx
git commit -m "feat: add subscription course card"
```

---

### Task 3: The rows band, mounted on /subscription

**Files:**
- Create: `src/app/features/courses/components/SubscriptionCourseRows.tsx`
- Modify: `src/app/(consumer)/subscription/page.tsx`

**Interfaces:**
- Consumes: `getSubscriptionCourseRows`, `SubscriptionCategoryRow` (Task 1); `SubscriptionCourseCard` (Task 2).
- Produces:
  - `SubscriptionCourseRows({ emptyMessage }: { emptyMessage: string })` — async server component.
  - `SubscriptionCourseRowsSkeleton()`.

**Expected during this task:** the "Ver todos" links point at `/subscribe/categories/...`, which does not exist until Task 4. Clicking one 404s. That is correct at this stage — do not stub the route here.

- [ ] **Step 1: Write the band component**

Create `src/app/features/courses/components/SubscriptionCourseRows.tsx`:

```tsx
import Link from "next/link";
import {
    getSubscriptionCourseRows,
    type SubscriptionCategoryRow,
} from "../db/subscriptionCourses";
import { SubscriptionCourseCard } from "./SubscriptionCourseCard";

// A row is a sampler, not a catalogue. Past this many, "Ver todos" is the way
// through — a strip nobody reaches the end of is worse than a shorter one.
const MAX_CARDS_PER_ROW = 12;

// The subscription library, one row per category, shown on both /subscription
// and /subscribe. Takes its own empty copy because the two pages are speaking
// to different people, even though the rows are identical.
export async function SubscriptionCourseRows({
    emptyMessage,
}: {
    emptyMessage: string;
}) {
    const rows = await getSubscriptionCourseRows();

    if (rows.length === 0) {
        return (
            <p className="text-center text-sm text-yellow-200/60">
                {emptyMessage}
            </p>
        );
    }

    return (
        <div className="flex flex-col gap-12">
            {rows.map(row => (
                <CourseRow key={row.categoryId ?? "uncategorized"} row={row} />
            ))}
        </div>
    );
}

// One category: its heading, its "Ver todos", and the strip.
//
// The strip scrolls with CSS alone — no client JavaScript, so it works before
// hydration and on any input a browser already handles. That costs one thing:
// a scrollable box is not reachable by keyboard unless it is focusable, hence
// `tabIndex`. Without it, arrow keys never reach the row and every card past
// the fold is unreachable without a mouse.
//
// The cut-off card at the container's right edge is the whole affordance. Do
// not add padding or a fade that hides it.
function CourseRow({ row }: { row: SubscriptionCategoryRow }) {
    const slug = row.categoryId ?? "uncategorized";
    const headingId = `subscription-row-${slug}`;

    return (
        <section aria-labelledby={headingId} className="flex flex-col gap-4">
            <div className="flex items-baseline justify-between gap-4 px-1">
                <h2
                    id={headingId}
                    className="text-xl tracking-widest text-yellow-200"
                >
                    {row.categoryName}
                </h2>
                {/* On every row, including short ones. Made conditional, the
                    headings stop lining up down the page. */}
                <Link
                    href={`/subscribe/categories/${slug}`}
                    className="shrink-0 text-xs tracking-widest text-yellow-200/60 uppercase underline hover:text-yellow-200"
                >
                    Ver todos
                </Link>
            </div>

            <div
                tabIndex={0}
                role="group"
                aria-labelledby={headingId}
                className="flex snap-x snap-mandatory gap-4 overflow-x-auto px-1 pb-2"
            >
                {row.courses.slice(0, MAX_CARDS_PER_ROW).map(course => (
                    <div
                        key={course.id}
                        className="w-60 shrink-0 snap-start"
                    >
                        <SubscriptionCourseCard course={course} />
                    </div>
                ))}
            </div>
        </section>
    );
}

// Two rows of five is enough to hold the shape of the band while it loads.
export function SubscriptionCourseRowsSkeleton() {
    return (
        <div className="flex animate-pulse flex-col gap-12">
            {Array.from({ length: 2 }, (_, rowIndex) => (
                <div key={rowIndex} className="flex flex-col gap-4">
                    <div className="h-6 w-48 rounded bg-yellow-200/20" />
                    <div className="flex gap-4 overflow-hidden">
                        {Array.from({ length: 5 }, (_, cardIndex) => (
                            <div
                                key={cardIndex}
                                className="h-56 w-60 shrink-0 rounded-2xl border border-yellow-200/20 bg-[#0a1628]/40"
                            />
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
}
```

- [ ] **Step 2: Mount the band on /subscription**

In `src/app/(consumer)/subscription/page.tsx`, add to the imports:

```tsx
import {
    SubscriptionCourseRows,
    SubscriptionCourseRowsSkeleton,
} from "@/app/features/courses/components/SubscriptionCourseRows";
```

Then replace the whole `SubscriptionPage` function body. The band is a **sibling** of the narrow column, not a child of it — the panel stays readable at `max-w-2xl` while the rows need room to run. It also gets its own `<Suspense>`: the panel is per-user and request-time, the band is neither, and making the band wait on the panel would be pure loss.

```tsx
export default function SubscriptionPage() {
    return (
        <main
            className={`${cinzel.className} min-h-screen w-full bg-[#0a1628] bg-linear-to-b from-[#12243f] via-[#0d1c31] to-[#0a1628]`}
        >
            <div className="mx-auto w-full max-w-2xl px-4 pt-24 pb-8 sm:pt-28">
                <Suspense fallback={<Skeleton />}>
                    <SubscriptionDetails />
                </Suspense>
            </div>

            {/* Wider than the panel above it on purpose: a row that stops at
                the panel's edge cannot show a card being cut off, and the cut
                is what says the row continues. */}
            <div className="mx-auto w-full max-w-6xl px-4 pb-16">
                <p className="mb-6 text-xs tracking-[0.3em] text-yellow-200/70 uppercase">
                    Incluido en tu plan
                </p>
                <Suspense fallback={<SubscriptionCourseRowsSkeleton />}>
                    <SubscriptionCourseRows emptyMessage="Aún no hay cursos incluidos en la suscripción." />
                </Suspense>
            </div>
        </main>
    );
}
```

Leave `SubscriptionDetails`, `Row`, `statusLabel` and `Skeleton` exactly as they are. Note the outer column's `pb-16` became `pb-8` — the bottom padding now belongs to the band.

- [ ] **Step 3: Verify the build**

Run: `pnpm lint`
Expected: clean.

Run: `pnpm build`
Expected: succeeds.

- [ ] **Step 4: Verify in the browser**

Run: `pnpm dev`

Sign in as a user with an active subscription and open `/subscription`. Confirm every one of these:

1. The plan panel is unchanged — same width, same status rows, same "Gestionar suscripción" button.
2. Below it: the eyebrow "Incluido en tu plan", then one row per category that has an included course.
3. Rows are alphabetical by category name; if an included course has no category, **Otros cursos** exists and is the last row.
4. A category with no included courses produces **no row at all**.
5. A row with more cards than fit shows the next card cut off at the right edge, and drags/shift-scrolls sideways, snapping to card starts.
6. Press Tab until focus reaches a strip, then press the right arrow — the strip scrolls.
7. A course with no `imageUrl` shows its name as a gold typographic cover, and sits level with its neighbours rather than being shorter.
8. Clicking a card opens `/courses/<id>`.
9. Narrow the window to phone width: roughly one card is visible with the next peeking, and **the page itself does not scroll horizontally** — only the strips do.

Check the admin side too: in `/admin/courses`, toggle a course's "included in subscription" off, then reload `/subscription`. The card disappears — this proves `getCourseGlobalTag()` is invalidating the band.

- [ ] **Step 5: Commit**

```bash
git add src/app/features/courses/components/SubscriptionCourseRows.tsx "src/app/(consumer)/subscription/page.tsx"
git commit -m "feat: add subscription course rows below the plan panel"
```

---

### Task 4: The per-category "Ver todos" page

**Files:**
- Create: `src/app/(consumer)/subscribe/categories/[categoryId]/page.tsx`
- Reference (read for the params/Suspense pattern, do not modify): `src/app/(consumer)/categories/[categoryId]/page.tsx`

**Interfaces:**
- Consumes: `getSubscriptionCoursesByCategory`, `UNCATEGORIZED_ROW_NAME` (Task 1); `SubscriptionCourseCard` (Task 2); `CatalogueShell` from `@/app/features/products/components/ProductCatalogue`.
- Produces: the route the "Ver todos" links from Task 3 already point at.

The page is **public** — no auth guard, no subscription check. It describes what an offer contains, which is exactly what someone deciding whether to buy should be able to read. That is also why it lives under `/subscribe` rather than the member-only `/subscription`.

- [ ] **Step 1: Write the page**

Create `src/app/(consumer)/subscribe/categories/[categoryId]/page.tsx`:

```tsx
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { cacheTag } from "next/cache";
import { db } from "@/drizzle/db";
import { CategoryTable } from "@/drizzle/schema";
import { getCategoryIdTag } from "@/app/features/categories/db/cache/categories";
import { CatalogueShell } from "@/app/features/products/components/ProductCatalogue";
import {
    getSubscriptionCoursesByCategory,
    UNCATEGORIZED_ROW_NAME,
} from "@/app/features/courses/db/subscriptionCourses";
import { SubscriptionCourseCard } from "@/app/features/courses/components/SubscriptionCourseCard";

// The URL for the catch-all row. A literal is safe because every category id is
// a uuid, so this can never collide with one — the same trick `CategoryNav`
// plays with "all".
const UNCATEGORIZED_SLUG = "uncategorized";

// Rejects anything that is not a uuid before it reaches Postgres, which would
// raise on the comparison rather than simply matching nothing. A 404 is the
// honest answer for a made-up id.
const UUID_PATTERN =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Everything the subscription includes from one category, in full.
//
// Public: no session is read and no subscription is checked. `params` is
// request-time under Cache Components, so everything depending on it lives
// inside the <Suspense> boundary and the frame renders immediately.
export default function SubscriptionCategoryPage({
    params,
}: {
    params: Promise<{ categoryId: string }>;
}) {
    return (
        <CatalogueShell>
            <Suspense fallback={<CategoryCoursesSkeleton />}>
                <CategoryCourses params={params} />
            </Suspense>
        </CatalogueShell>
    );
}

async function CategoryCourses({
    params,
}: {
    params: Promise<{ categoryId: string }>;
}) {
    const { categoryId } = await params;
    const isUncategorized = categoryId === UNCATEGORIZED_SLUG;

    if (!isUncategorized && !UUID_PATTERN.test(categoryId)) return notFound();

    // The heading comes from the category row, the cards from the course
    // query. Two reads because they invalidate on different things: renaming a
    // category changes the title, flagging a course changes the grid.
    const category = isUncategorized ? null : await getCategory(categoryId);

    if (!isUncategorized && category == null) return notFound();

    const courses = await getSubscriptionCoursesByCategory(
        isUncategorized ? null : categoryId
    );

    return (
        <>
            <h1 className="mb-2 text-center text-3xl tracking-widest text-yellow-200">
                {category?.name ?? UNCATEGORIZED_ROW_NAME}
            </h1>
            {category?.description && (
                <p className="mx-auto mb-8 max-w-2xl text-center text-sm text-yellow-200/70">
                    {category.description}
                </p>
            )}

            {/* Not a 404: the category exists, it simply has nothing in the
                plan yet, and those are different things to say. */}
            {courses.length === 0 ? (
                <p className="mt-12 text-center text-yellow-200/70">
                    Aún no hay cursos de esta categoría incluidos en la
                    suscripción.
                </p>
            ) : (
                <div className="mt-8 grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-6">
                    {courses.map(course => (
                        <SubscriptionCourseCard
                            key={course.id}
                            course={course}
                        />
                    ))}
                </div>
            )}
        </>
    );
}

async function getCategory(id: string) {
    "use cache";
    cacheTag(getCategoryIdTag(id));

    return db.query.CategoryTable.findFirst({
        columns: { name: true, description: true },
        where: eq(CategoryTable.id, id),
    });
}

function CategoryCoursesSkeleton() {
    return (
        <div className="animate-pulse">
            <div className="mx-auto h-8 w-64 rounded bg-yellow-200/20" />
            <div className="mt-8 grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-6">
                {Array.from({ length: 6 }, (_, index) => (
                    <div
                        key={index}
                        className="h-56 rounded-2xl border border-yellow-200/20 bg-[#0a1628]/40"
                    />
                ))}
            </div>
        </div>
    );
}
```

- [ ] **Step 2: Verify the build**

Run: `pnpm lint`
Expected: clean.

Run: `pnpm build`
Expected: succeeds.

- [ ] **Step 3: Verify in the browser**

Run: `pnpm dev`. Check all of these:

1. From `/subscription`, click "Ver todos" on a named category — it lands on `/subscribe/categories/<uuid>` and shows that category's name, its description if it has one, and a grid of the same cards.
2. **Signed out** (use a private window), the same URL still loads. It must not redirect to `/login` or `/subscribe`.
3. "Ver todos" on **Otros cursos** lands on `/subscribe/categories/uncategorized` and shows the heading "Otros cursos" with no description.
4. `/subscribe/categories/not-a-real-id` returns 404, **not** a 500 — this is the uuid guard doing its job.
5. `/subscribe/categories/<uuid of a real category with nothing in the plan>` shows the "Aún no hay cursos de esta categoría…" message, not a 404.
6. Cards in the grid are all the same height, including any with a typographic cover.

- [ ] **Step 4: Commit**

```bash
git add "src/app/(consumer)/subscribe/categories/[categoryId]/page.tsx"
git commit -m "feat: add per-category page for subscription courses"
```

---

### Task 5: Replace the flat list on /subscribe

**Files:**
- Modify: `src/app/(consumer)/subscribe/page.tsx`

**Interfaces:**
- Consumes: `SubscriptionCourseRows`, `SubscriptionCourseRowsSkeleton` (Task 3).
- Produces: nothing new.

This touches a page in the paid funnel. The `Plans` component and everything it uses — pricing, the PPP coupon, `startSubscriptionCheckout` — must not be altered. Only the included-courses section changes.

- [ ] **Step 1: Delete the old section**

From `src/app/(consumer)/subscribe/page.tsx`, delete the entire `IncludedCourses` function and the entire `getSubscriptionCourses` function beneath it.

- [ ] **Step 2: Remove the imports that only those two used**

Delete these import lines — each one is now unused, and `pnpm build` will fail on them if left:

```tsx
import { asc, eq } from "drizzle-orm";
import { cacheTag } from "next/cache";
import { db } from "@/drizzle/db";
import { CourseTable } from "@/drizzle/schema";
import { getCourseGlobalTag } from "@/app/features/courses/db/cache/courses";
```

And narrow the formatters import — `formatPlural` was only used by the deleted list, `formatPrice` is still used by `PlanCard`:

```tsx
import { formatPrice } from "@/lib/formatters";
```

**Keep** `Suspense`, `Link`, `redirect`, `getCurrentUser`, `hasActiveSubscription`, `getSubscriptionPlans`, `getUserCoupon`, `getDiscountedPriceInDollars`, `startSubscriptionCheckout` and `cinzel`. All are still used.

- [ ] **Step 3: Add the band import**

```tsx
import {
    SubscriptionCourseRows,
    SubscriptionCourseRowsSkeleton,
} from "@/app/features/courses/components/SubscriptionCourseRows";
```

- [ ] **Step 4: Restructure the page**

Replace the whole `SubscribePage` function. The heading and plans keep their `max-w-4xl`; the band gets `max-w-6xl` as its own sibling, for the same reason as on `/subscription`.

```tsx
export default function SubscribePage() {
    return (
        <main
            className={`${cinzel.className} min-h-screen w-full bg-[#0a1628] bg-linear-to-b from-[#12243f] via-[#0d1c31] to-[#0a1628]`}
        >
            <div className="mx-auto w-full max-w-4xl px-4 pt-24 pb-8 sm:pt-28">
                <div className="flex flex-col items-center gap-3 text-center">
                    <p className="text-xs tracking-[0.3em] text-yellow-200/70 uppercase">
                        Suscripción
                    </p>
                    <h1 className="text-4xl tracking-wide text-yellow-100">
                        Acceso a toda la biblioteca
                    </h1>
                    <p className="max-w-xl text-yellow-200/80">
                        Un solo pago recurrente para entrar a los cursos
                        incluidos. Cancela cuando quieras.
                    </p>
                </div>

                <Suspense fallback={<PlansSkeleton />}>
                    <Plans />
                </Suspense>
            </div>

            {/* The same rows the subscriber sees, shown here as the contents of
                the offer. Grouped and illustrated, where this used to be a
                flat list of names. */}
            <div className="mx-auto w-full max-w-6xl px-4 pb-16">
                <Suspense fallback={<SubscriptionCourseRowsSkeleton />}>
                    <SubscriptionCourseRows emptyMessage="Aún no hay cursos incluidos en la suscripción." />
                </Suspense>

                <p className="mt-12 text-center text-xs text-yellow-200/40">
                    <Link
                        href="/products"
                        className="underline hover:text-yellow-200/70"
                    >
                        Ver también los cursos disponibles para compra
                        individual
                    </Link>
                </p>
            </div>
        </main>
    );
}
```

Leave `Plans`, `applyCoupon`, `PlanCard` and `PlansSkeleton` untouched.

- [ ] **Step 5: Verify the build**

Run: `pnpm lint`
Expected: clean, with no unused-import warnings.

Run: `pnpm build`
Expected: succeeds.

- [ ] **Step 6: Verify all three states in the browser**

Run: `pnpm dev`. `/subscribe` behaves differently for three kinds of visitor and all three must be checked:

1. **Signed out:** `/subscribe` shows the heading, both plan cards, then the category rows. The old flat `<ul>` of course names is gone. The "Ver también los cursos disponibles para compra individual" link is still there, below the rows.
2. **Signed in, no subscription:** same as above, and the plan prices still render — including the PPP discount line if the account resolves to a discounted country group. Click "Suscribirme" and confirm a Stripe checkout session still opens.
3. **Signed in, active subscription:** `/subscribe` still redirects to `/subscription`.

Then confirm the two pages agree: the rows on `/subscribe` and on `/subscription` show the same categories in the same order with the same cards.

- [ ] **Step 7: Commit**

```bash
git add "src/app/(consumer)/subscribe/page.tsx"
git commit -m "feat: show grouped course rows on the subscribe page"
```

---

## Final verification

After Task 5, run the whole thing once more from a clean build:

- [ ] `pnpm lint` — clean.
- [ ] `pnpm build` — succeeds.
- [ ] `git status` — clean tree, five commits ahead.
- [ ] `/subscription` and `/subscribe` both render the band; the plan panel and the pricing cards are unchanged from before this work.
- [ ] Every "Ver todos" link resolves — no 404s left over from Task 3.
- [ ] Neither page scrolls horizontally at phone width.
