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
| `src/app/features/purchases/db/userPurchases.ts` | `getUserPurchases(userId)` — the read model, cached |
| `src/app/features/purchases/actions/receipt.ts` | `openPurchaseReceipt` server action → redirect to Stripe's hosted receipt |
| `src/app/features/purchases/components/PurchaseRow.tsx` | One row, presentational |

No existing file is modified. The navbar link is already in place.

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
  hasReceipt: boolean        // stripePaymentIntentId != null
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

`stripePaymentIntentId` is deliberately absent from the returned type. It stays
server-side; nothing that identifies a Stripe object reaches the browser.

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

## Receipt action

A plain `<form action={openPurchaseReceipt}>` carrying a hidden `purchaseId`,
the same shape as `openBillingPortal` on the subscription page. No client
component and no JavaScript.

`ActionButton` is the wrong tool here: it expects `{ error, message }` back and
raises a toast, but this action never returns normally — it redirects.

Steps:

1. `getCurrentUser()`; `redirect("/login")` when absent.
2. Load the purchase filtered by **id AND userId together**. `purchaseId`
   arrives from the browser and is untrusted, so this pairing is the ownership
   check — without it, anyone could read anyone else's receipt by guessing an id.
3. `stripe.paymentIntents.retrieve(id, { expand: ["latest_charge"] })`, then
   read `latest_charge.receipt_url`.
4. `redirect(receiptUrl)`.

On any failure — missing payment intent, Stripe error, null `receipt_url` —
redirect back to `/purchases?recibo=error` rather than throwing into an error
boundary. The page renders a short Spanish notice above the list when that
search param is present.

## UI

Compact rows, on the existing navy / `yellow-200` / Cinzel palette shared by the
other consumer pages.

Each row carries a 16:9 thumbnail, the product name, the purchase date, the
price, and its actions:

- **Date** — `toLocaleDateString("es", { day: "numeric", month: "long", year: "numeric" })`,
  matching the subscription page.
- **Price** — `formatPrice(pricePaidInCents / 100)`. A fully-discounted purchase
  renders as "Gratis", which is correct.
- **Ver curso** — links to `/courses/[courseId]` when `courseId` is set;
  otherwise **Ver cursos**, linking to `/courses`.
- **Ver recibo** — the receipt form, rendered only when `hasReceipt` is true.

Refunded rows keep their place in the list, carrying a `Reembolsada` badge at
reduced opacity. History should be honest: money changed hands and then came
back, and hiding the row makes people think they were charged silently.

A refunded row shows **no** course link, because the refund revoked access and
the link would lead to a locked page. It keeps the receipt button — a refund is
exactly the event someone wants the paperwork for.

The page is server-rendered throughout. The heading paints immediately and the
list streams in under `Suspense`, since everything below the title depends on
who is asking.

## Edge cases

- **Signed out** — a line of Spanish copy plus login and catalogue links,
  following the Mis Cursos pattern.
- **No purchases** — copy pointing at the catalogue rather than stopping at
  "you have none".
- **Row without `stripePaymentIntentId`** — rows written before that column
  existed simply render no receipt button.
- **Product bundling several courses** — one link to `/courses`, labelled in
  the plural.

## Verification

The project has no test framework, so verification is a build plus manual
passes.

- `pnpm lint`
- `pnpm build` (typecheck)
- Manually: signed out; zero purchases; a normal purchase; a refunded purchase;
  a product bundling several courses; the receipt round trip against sandbox
  Stripe; and the `?recibo=error` notice.
