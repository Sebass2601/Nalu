# Purchase history page (`/purchases`)

Date: 2026-07-29

## Problem

The consumer navbar already renders a **Compras** tab pointing at `/purchases`
(`src/app/(consumer)/layout.tsx`), but no such route exists — signed-in users
who click it get a 404. This spec covers building the page behind that link.

## Scope

One-time product purchases only, read from `PurchaseTable`.

Subscription payment history is deliberately excluded. Those invoices live in
Stripe's billing portal, already reachable from `/subscription`. Rebuilding them
here would mean either a per-render Stripe API call (slow, defeats caching) or a
new local invoice table fed by more webhook events — a second source of truth
that can drift from Stripe's.

No schema change. Every column this feature reads already exists;
`stripePaymentIntentId` was added in migration `0010_regular_the_spike.sql`.

## Files

| File | Responsibility |
|---|---|
| `src/app/(consumer)/purchases/page.tsx` | Route shell: heading, `Suspense`, skeleton, signed-out and empty states |
| `src/app/(consumer)/purchases/[purchaseId]/page.tsx` | The receipt for one purchase, plus the link out to Stripe's hosted copy |
| `src/app/features/purchases/db/userPurchases.ts` | `getUserPurchases(userId)` — the list read model, cached |
| `src/app/features/purchases/components/PurchaseRow.tsx` | One row, presentational |

`src/lib/formatters.ts` gains a shared `formatDate`, since both the list and the
receipt render the same long-form Spanish date. The navbar link is already in
place and needs no change.

This mirrors `src/app/features/courses/db/myCourses.ts`, which solves the same
shape of problem: a page-specific read model assembled from several tables,
kept out of both the route file and the generic feature DB module.

## Data layer

```ts
export type UserPurchase = {
  id: string
  productName: string        // from the productDetails snapshot
  productImageUrl: string    // from the productDetails snapshot
  pricePaidInCents: number
  purchasedAt: Date
  refundedAt: Date | null
  courseId: string | null    // set only when the product maps to exactly one course
}
```

`getUserPurchases(userId)` runs two queries:

1. Purchases for this user, ordered `createdAt desc`. Refunded rows are
   **included** — unlike `userOwnsProduct`, which filters on `isNull(refundedAt)`
   because it answers a question about access. This one answers a question about
   history, so a refund is a row to label, not a row to drop.
2. `CourseProductTable` rows filtered to those product ids, grouped by product.
   Exactly one course → that id, for a deep link. Zero or several → `null`.

Display fields come from the `productDetails` JSON snapshot, never from the live
`ProductTable` row. That is the snapshot's entire purpose: a receipt has to keep
showing what was actually bought after the product is renamed, repriced, or has
its image replaced.

Nothing identifying a Stripe object is returned. Each row links to its own
receipt page by purchase id, and that page looks up what it needs server-side.

### Caching

`"use cache"` tagged with:

- `getPurchaseUserTag(userId)` — `insertPurchase` and `refundPurchase` already
  call `expirePurchaseCache(userId)`, so both new sales and refunds invalidate.
- `getProductGlobalTag()` — the product→course links are edited through the
  product admin form, so re-linking a product must move its deep links.

Caching a per-user answer is safe because `userId` is an argument and therefore
part of the cache key: one entry per user, never shared.

### No pagination

The list is ordered newest first and renders in full. A realistic user has a
handful of rows; paging would be building for a load that does not exist.

## Receipt page

`/purchases/[purchaseId]` renders the receipt itself rather than bouncing
straight out to Stripe. Modelled on the reference implementation in
`~/project_copy/course-platform`, restyled for this app and in Spanish.

The receipt is built from **our own** records — product name, date, customer,
amount, paid-or-refunded — so it stands up regardless of Stripe's availability.
Stripe is consulted for the two things only it knows: the URL of its hosted
receipt, and the breakdown of how the final price was reached.

Load path:

1. `getCurrentUser({ withFullUser: true })`; `redirect("/login")` when absent.
   The full user is needed because the receipt names the customer.
2. Load the purchase filtered by **id AND userId together**. The id comes from
   the URL and is untrusted, so this pairing is the authorization check —
   without it anyone could read anyone else's receipt by guessing an id.
3. `notFound()` when that returns nothing. This covers "no such purchase" and
   "not yours" with one answer on purpose; a distinct message for the second
   would confirm to a stranger that the id belongs to somebody.
4. `stripe.checkout.sessions.retrieve(stripeSessionId, { expand: [...] })` for
   `payment_intent.latest_charge` and `total_details.breakdown.discounts`.

The session is retrieved rather than the payment intent, because it carries the
discount breakdown as well as the charge. That matters here: regional pricing
means a purchase can be discounted, and the breakdown is what explains the gap
between the list price and what was actually paid.

### Caching

`getPurchase` is tagged with `getPurchaseUserTag(userId)`, not a per-purchase
tag. The user tag is the one `insertPurchase` and `refundPurchase` already
expire; a per-id tag would look tighter but nothing invalidates it, so a
refunded purchase would go on presenting itself as paid.

The Stripe call is deliberately left uncached — it runs only when someone opens
one specific receipt, and a hosted receipt URL is worth fetching fresh.

### Pricing rows

An undiscounted purchase shows a single bold **Total**; an identical Subtotal
above it would be noise. Anything that moved the price — a regional coupon, a
refund — expands it into Subtotal / adjustments / Total.

Coupons here are named for their own rate (`PPP 30%`), so the label is the
coupon name alone, falling back to the percentage and then to "Descuento" for
coupons carrying neither.

### Stripe failure

The Stripe call is wrapped: on any error the page still renders the full local
receipt, minus the hosted link and the discount breakdown, since neither is
information we hold. A local receipt that 500s because a third party is down
would defeat its own purpose.

## UI

Both pages use the existing navy / `yellow-200` / Cinzel palette shared by the
other consumer pages, and are server-rendered throughout with no client
JavaScript. Headings paint immediately; the parts that depend on who is asking
stream in under `Suspense`.

### The list

Each row carries a 16:9 thumbnail, the product name, the purchase date, the
price, and its actions:

- **Date** — the shared `formatDate`.
- **Price** — `formatPrice(pricePaidInCents / 100)`. A fully-discounted purchase
  renders as "Gratis", which is correct.
- **Ver curso** — links to `/courses/[courseId]` when `courseId` is set;
  otherwise **Ver cursos**, linking to `/courses`.
- **Ver recibo** — links to `/purchases/[purchaseId]`, on every row.

Refunded rows keep their place in the list, carrying a `Reembolsada` badge at
reduced opacity. History should be honest: money changed hands and then came
back, and hiding the row makes people think they were charged silently.

A refunded row shows **no** course link, because the refund revoked access and
the link would lead to a locked page. It keeps the receipt link — a refund is
exactly the event someone wants the paperwork for.

### The receipt

A back link to the list, the product name as the heading, and — when Stripe
returned one — **Ver recibo de Stripe** opening the hosted copy in a new tab.

Below that, one panel: a `Recibo` header carrying the purchase id and a
`Pagada` / `Reembolsada` badge; a `Fecha` / `Producto` / `Cliente` / `Vendedor`
grid; and the pricing rows, with the total in a brighter weight.

Amounts here use `formatPrice(..., { showZeroAsNumber: true })`. On a receipt a
zero is an amount, not the word "Gratis" — a fully refunded total of $0 is
precisely the point being made.

## Edge cases

- **Signed out** — the list shows a line of Spanish copy plus login and
  catalogue links, following the Mis Cursos pattern; the receipt redirects to
  `/login`.
- **No purchases** — copy pointing at the catalogue rather than stopping at
  "you have none".
- **Unknown or someone else's purchase id** — `notFound()`, identically.
- **Stripe unreachable** — the local receipt renders without the hosted link or
  the discount breakdown.
- **Product bundling several courses** — one link to `/courses`, labelled in
  the plural.

## Verification

The project has no test framework, so verification is a build plus manual
passes.

- `pnpm lint`
- `npx tsc --noEmit`
- `pnpm build`
- Manually: signed out; zero purchases; a normal purchase; a discounted
  purchase, checking the breakdown; a refunded purchase; a product bundling
  several courses; another user's purchase id in the URL; and the link out to
  Stripe's hosted receipt against sandbox Stripe.
