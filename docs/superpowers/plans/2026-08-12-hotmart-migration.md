# Hotmart Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace Stripe with Hotmart end to end, leaving no Stripe or Polar import in `src/`, with subscriptions built but switched off.

**Architecture:** Hotmart is a marketplace, not a payment API — its dashboard owns the catalogue and there are no write endpoints for products or checkouts. The app therefore stops driving the provider and starts listening to it: checkout becomes a URL built server-side, and the webhook becomes the single path by which a payment turns into access. Provider-specific code is confined to `lib/hotmart.ts`, `checkoutLink.ts`, the webhook route, and the receipt/refund/subscription calls.

**Tech Stack:** Next.js 16 (App Router, `cacheComponents`), Drizzle ORM, Postgres 17, Vitest, zod, no Hotmart SDK (none exists).

Spec: `docs/superpowers/specs/2026-08-11-hotmart-migration-design.md`

## Global Constraints

- Package manager is **pnpm**. Never `npm`.
- This Next.js version has breaking changes from training data. Read `node_modules/next/dist/docs/` before writing framework code. Middleware is `src/proxy.ts`.
- Branch: `feat/hotmart-implementation-code`, already cut and with `main` merged.
- The migration is **`0019`** — `0018_crazy_klaw` belongs to the admin access panel already on `main`.
- Column names are **provider-neutral**: `orderId`, `externalProductId`, `checkoutCode`, `externalOfferCode`, `externalSubscriptionId`.
- **Never** pass an amount to Hotmart. It owns every price.
- Currency is **USD only**.
- `SUBSCRIPTIONS_ENABLED=false` at launch; the eight `HOTMART_ALL_ACCESS_*` variables must stay absent and the app must still boot.
- Six env variables are already present and verified in `.env`: `HOTMART_SERVER`, `HOTMART_CLIENT_ID`, `HOTMART_CLIENT_SECRET`, `HOTMART_BASIC_TOKEN`, `HOTMART_HOTTOK`, `SUBSCRIPTIONS_ENABLED`.
- Stripe env vars stay in the schema until Task 8 so the build never breaks mid-migration.
- Commit after every task.

## File Structure

| File | Responsibility |
|---|---|
| `src/lib/hotmart.ts` | OAuth token cache + `hotmartFetch()`. The only file that knows Hotmart's base URLs |
| `src/lib/hotmartApi.ts` | Typed wrappers: `getHotmartProduct`, `getHotmartSale`, `refundHotmartSale`, `cancelHotmartSubscription` |
| `src/lib/webhookDedupe.ts` | `alreadyProcessed()` — inside the caller's transaction |
| `src/app/features/purchases/lib/checkoutLink.ts` | Pure URL builder. No I/O |
| `src/app/features/purchases/actions/hotmart.ts` | `startCheckout` server action |
| `src/app/api/webhooks/hotmart/route.ts` | Event intake, hottok verification, dispatch |
| `src/app/api/webhooks/hotmart/handlers.ts` | The three handlers. Split from the route so they are unit-testable without HTTP |
| `src/app/(consumer)/purchase/success/page.tsx` | Post-payment landing, polls |
| `src/app/(consumer)/purchase/pending/page.tsx` | Slow-payment landing |
| `src/drizzle/schema/processedWebhook.ts` | Dedupe table |

---

### Task 1: Schema migration and env schema

Renames every Stripe identifier column to its provider-neutral equivalent, adds the promo and Hotmart code columns, drops the country-group tables, and adds the `SUBSCRIPTIONS_ENABLED` refinement. The code still calls Stripe after this task; only names change, so the build must stay green.

**Files:**
- Modify: `src/drizzle/schema/product.ts`, `purchase.ts`, `user.ts`, `subscription.ts`
- Delete: `src/drizzle/schema/countryGroup.ts`, `country.ts`
- Create: `src/drizzle/schema/processedWebhook.ts`
- Modify: `src/drizzle/schema.ts`, `src/data/env/server.ts`, `src/test/setup.ts`
- Create: `src/drizzle/migrations/0019_*.sql`

**Interfaces:**
- Produces: `ProductTable.externalProductId | checkoutCode | externalOfferCode | promoOfferCode | promoPriceInDollars | promoEndsAt`, `PurchaseTable.orderId | buyerCountry`, `SubscriptionTable.externalSubscriptionId | externalProductId`, `ProcessedWebhookTable`, `env.SUBSCRIPTIONS_ENABLED`

- [ ] **Step 1: Rewrite the product columns**

In `src/drizzle/schema/product.ts`, replace `stripeProductId` and `stripePriceId`:

```ts
    // Hotmart needs three identifiers for three different jobs, and they are
    // not interchangeable.
    //
    // externalProductId — the 7-digit ID. Arrives as `data.product.id` on every
    //   webhook, so it is the key that matches a Hotmart sale to this row.
    // checkoutCode — the hotlink (Products -> HotLinks). A different code
    //   entirely, and the one the checkout URL is built from.
    // externalOfferCode — which offer, i.e. which price.
    //
    // All nullable: a product can be drafted here before it exists in Hotmart,
    // and there is no API to create it, so the codes arrive by hand later.
    externalProductId: text(),
    checkoutCode: text(),
    externalOfferCode: text(),

    // An optional second offer at a promotional price. Hotmart models a
    // promotion as a separate offer on the same product, so running one is a
    // matter of pointing checkout at a different code — reversible, and its
    // reporting stays honest about what each sale earned.
    //
    // `promoPriceInDollars` is display copy only, like `priceInDollars`:
    // Hotmart charges whatever the offer says. A promo is live when the code is
    // set AND the end date is null or still in the future, evaluated at read
    // time so it lapses on its own without a scheduled job.
    promoOfferCode: text(),
    promoPriceInDollars: integer(),
    promoEndsAt: timestamp({ withTimezone: true }),
```

Add `timestamp` to the `drizzle-orm/pg-core` import.

- [ ] **Step 2: Rewrite the purchase columns**

In `src/drizzle/schema/purchase.ts`, replace `polarCheckoutId` and `polarOrderId` with one column:

```ts
    // Hotmart's transaction code, e.g. HP17715690036014. One column where
    // Stripe needed two: Stripe keyed refunds by charge and checkouts by
    // session, so both had to be stored. Hotmart identifies the sale with this
    // single code everywhere, including on refunds.
    orderId: text().notNull().unique(),
```

Keep `buyerCountry` and update its comment to name `purchase.checkout_country.iso` as the source.

- [ ] **Step 3: Rewrite the subscription columns**

In `src/drizzle/schema/subscription.ts`, replace `stripeCustomerId`, `stripeSubscriptionId` and `stripePriceId`:

```ts
    // Hotmart's subscriber_code. Unique so a redelivered webhook cannot create
    // a duplicate row.
    externalSubscriptionId: text().notNull().unique(),
    // The Hotmart product behind the plan — monthly and yearly are separate
    // products, because Hotmart fixes the billing interval on the product.
    externalProductId: text().notNull(),
```

Replace the status vocabulary entirely. Hotmart's words are not Stripe's:

```ts
// Hotmart's own subscription statuses. Deliberately NOT a translation of
// Stripe's — the vocabularies genuinely differ, and mapping one onto the other
// would crash on the first cancellation.
export const subscriptionStatuses = [
    "ACTIVE",
    "INACTIVE",
    "DELAYED",
    "CANCELLED_BY_CUSTOMER",
    "CANCELLED_BY_SELLER",
    "CANCELLED_BY_ADMIN",
    "STARTED",
    "OVERDUE",
] as const;

// Which statuses unlock content. DELAYED and OVERDUE count for the same reason
// Stripe's `past_due` did: cutting someone off the hour their card bounces
// punishes a paying customer whose retry usually succeeds. The CANCELLED_BY_*
// states are where access genuinely stops — subject to currentPeriodEnd, which
// is what lets a cancelled subscriber keep the time they already paid for.
export const activeSubscriptionStatuses = [
    "ACTIVE",
    "STARTED",
    "DELAYED",
    "OVERDUE",
] as const satisfies readonly SubscriptionStatus[];
```

- [ ] **Step 4: Drop `users.stripeCustomerId`**

Delete the line from `src/drizzle/schema/user.ts`. Hotmart identifies a buyer by email and by the `sck` value we send, so nothing needs storing.

- [ ] **Step 5: Create the dedupe table**

Create `src/drizzle/schema/processedWebhook.ts`:

```ts
import { pgTable, text, timestamp } from "drizzle-orm/pg-core";

// One row per webhook delivery already handled.
//
// Keyed on Hotmart's event `id`. This is the ONLY replay defence available:
// Hotmart sends a static hottok with no timestamp, so there is nothing to
// reject a stale request by.
//
// The row is written INSIDE the same transaction as the work it guards. Writing
// it first, as a separate statement, is a trap: a handler that then fails would
// leave the row committed, and Hotmart's retry would be dismissed as a
// duplicate — silently robbing the buyer of what they paid for.
export const ProcessedWebhookTable = pgTable("processed_webhooks", {
    eventId: text().primaryKey(),
    eventType: text().notNull(),
    processedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
});
```

Export it from `src/drizzle/schema.ts`; remove the `countryGroup` and `country` exports.

- [ ] **Step 6: Delete the country-group schema files**

```bash
git rm src/drizzle/schema/countryGroup.ts src/drizzle/schema/country.ts
```

- [ ] **Step 7: Add the env variables with the refinement**

In `src/data/env/server.ts`, replace the Stripe block:

```ts
        // --- Hotmart -----------------------------------------------------
        // Hotmart is the merchant of record: legally the seller, so it collects
        // and remits VAT worldwide. There is no Node SDK, so these feed a
        // hand-written fetch wrapper.
        //
        // Sandbox and production are separate credential pairs. The sandbox
        // returns fictional canned data for REST endpoints only — it has no
        // checkout and delivers no webhooks — so this switches which set of
        // stubs or real endpoints `hotmartFetch` talks to, nothing more.
        HOTMART_SERVER: z.enum(["sandbox", "production"]).default("production"),
        HOTMART_CLIENT_ID: z.string().min(1),
        HOTMART_CLIENT_SECRET: z.string().min(1),

        // Stored WITHOUT the "Basic " prefix — the client adds it. Pasting the
        // prefixed form yields "Authorization: Basic Basic ..." and a 401 that
        // looks exactly like wrong credentials.
        HOTMART_BASIC_TOKEN: z.string().min(1),

        // The webhook's shared secret, sent as X-HOTMART-HOTTOK on every
        // delivery. Weaker than a signature: it is the same string every time,
        // with no timestamp and no binding to the body, so anyone who learns it
        // can forge any event. Compared with timingSafeEqual, deduplicated on
        // event id, and high-value events are re-verified against the API.
        HOTMART_HOTTOK: z.string().min(1),

        // Subscriptions are built and tested but not sold yet: no Hotmart
        // subscription product exists. See the refinement below, which is what
        // makes the eight ALL_ACCESS variables legally absent.
        SUBSCRIPTIONS_ENABLED: z
            .enum(["true", "false"])
            .default("false")
            .transform(value => value === "true"),

        HOTMART_ALL_ACCESS_MONTHLY_PRODUCT_ID: z.string().min(1).optional(),
        HOTMART_ALL_ACCESS_MONTHLY_CHECKOUT_CODE: z.string().min(1).optional(),
        HOTMART_ALL_ACCESS_MONTHLY_OFFER_CODE: z.string().min(1).optional(),
        HOTMART_ALL_ACCESS_MONTHLY_PRICE: z.coerce.number().int().positive().optional(),
        HOTMART_ALL_ACCESS_YEARLY_PRODUCT_ID: z.string().min(1).optional(),
        HOTMART_ALL_ACCESS_YEARLY_CHECKOUT_CODE: z.string().min(1).optional(),
        HOTMART_ALL_ACCESS_YEARLY_OFFER_CODE: z.string().min(1).optional(),
        HOTMART_ALL_ACCESS_YEARLY_PRICE: z.coerce.number().int().positive().optional(),
```

Then, on the `createEnv` call, add the cross-field check. Marking the eight merely optional would be simpler and worse: it permits a half-configured state that boots happily and fails at a customer's checkout, which is the exact failure the schema exists to prevent.

- [ ] **Step 8: Add the test fixtures**

In `src/test/setup.ts`, add alongside the Stripe ones (which stay until Task 8):

```ts
    HOTMART_SERVER: "sandbox",
    HOTMART_CLIENT_ID: "test-client-id",
    HOTMART_CLIENT_SECRET: "test-client-secret",
    HOTMART_BASIC_TOKEN: "dGVzdC1iYXNpYy10b2tlbg==",
    HOTMART_HOTTOK: "test-hottok",
    SUBSCRIPTIONS_ENABLED: "false",
```

- [ ] **Step 9: Generate and inspect the migration**

```bash
pnpm db:generate
```

Answer **rename** where drizzle-kit asks, so values survive. Confirm the file is numbered `0019` and that it drops `country_groups` and `countries`.

- [ ] **Step 10: Fix every compile error**

```bash
pnpm build
```

Work through each error, renaming reads and writes. Call sites still use the Stripe SDK; only property names change.

- [ ] **Step 11: Apply and commit**

```bash
pnpm db:migrate && pnpm test && pnpm build
git add -A && git commit -m "feat: provider-neutral schema and Hotmart env"
```

---

### Task 2: The Hotmart client

**Files:**
- Create: `src/lib/hotmart.ts`, `src/lib/hotmart.test.ts`

**Interfaces:**
- Produces: `hotmartFetch<T>(path: string, init?: RequestInit): Promise<T>`, `resetHotmartToken(): void` (test seam), `HotmartApiError` with `.status: number`

- [ ] **Step 1: Write the failing test**

```ts
import { beforeEach, describe, expect, it, vi } from "vitest";
import { hotmartFetch, resetHotmartToken, HotmartApiError } from "./hotmart";

const fetchMock = vi.fn();
vi.stubGlobal("fetch", fetchMock);

function tokenResponse(expiresIn = 3600) {
    return { ok: true, status: 200, json: async () => ({ access_token: "tok", expires_in: expiresIn }) };
}
function jsonResponse(body: unknown) {
    return { ok: true, status: 200, json: async () => body };
}

beforeEach(() => { fetchMock.mockReset(); resetHotmartToken(); });

describe("hotmartFetch", () => {
    it("fetches a token once and reuses it", async () => {
        fetchMock.mockResolvedValueOnce(tokenResponse())
                 .mockResolvedValueOnce(jsonResponse({ items: [] }))
                 .mockResolvedValueOnce(jsonResponse({ items: [] }));

        await hotmartFetch("/payments/api/v1/sales/history");
        await hotmartFetch("/payments/api/v1/sales/history");

        // 1 token + 2 calls, NOT 2 tokens
        expect(fetchMock).toHaveBeenCalledTimes(3);
    });

    it("re-authenticates once when a call returns 401", async () => {
        fetchMock.mockResolvedValueOnce(tokenResponse())
                 .mockResolvedValueOnce({ ok: false, status: 401, text: async () => "expired" })
                 .mockResolvedValueOnce(tokenResponse())
                 .mockResolvedValueOnce(jsonResponse({ ok: true }));

        await expect(hotmartFetch("/x")).resolves.toEqual({ ok: true });
    });

    it("throws HotmartApiError carrying the status", async () => {
        fetchMock.mockResolvedValueOnce(tokenResponse())
                 .mockResolvedValueOnce({ ok: false, status: 404, text: async () => "not found" });

        await expect(hotmartFetch("/x")).rejects.toMatchObject({ status: 404 });
    });
});
```

- [ ] **Step 2: Run it and watch it fail**

```bash
pnpm test src/lib/hotmart.test.ts
```

Expected: FAIL — cannot resolve `./hotmart`.

- [ ] **Step 3: Write the client, then re-run until green**

Token cached in module scope with its expiry, refreshed 60s early. One retry on 401 and no more, so a genuinely revoked credential fails loudly instead of looping.

- [ ] **Step 4: Commit**

```bash
pnpm test && git add -A && git commit -m "feat: Hotmart OAuth client and fetch wrapper"
```

---

### Task 3: Typed API wrappers

**Files:**
- Create: `src/lib/hotmartApi.ts`

**Interfaces:**
- Produces: `getHotmartProduct(id)`, `getHotmartSale(transaction)`, `refundHotmartSale(transaction)`, `cancelHotmartSubscription(subscriberCode, sendEmail)`

- [ ] **Step 1: Write the wrappers**

Each is a thin typed call over `hotmartFetch`. `getHotmartProduct` returns `null` on 404 rather than throwing, because the admin form uses it to *validate* a pasted code and "not found" is an expected answer there, not an error.

- [ ] **Step 2: Build, then commit**

```bash
pnpm build && git add -A && git commit -m "feat: typed Hotmart API wrappers"
```

---

### Task 4: Product codes in the admin

Replaces the auto-sync. There is no write API, so the admin pastes three codes and the app verifies them.

**Files:**
- Modify: `src/app/features/products/schemas/products.ts`, `db/products.ts`, the product form component
- Delete: `src/app/features/products/lib/stripeProducts.ts`
- Create: `src/app/features/products/lib/promoOffer.ts`, `promoOffer.test.ts`

**Interfaces:**
- Produces: `activeOfferCode(product): string | null`, `isPromoLive(product, now?): boolean`

- [ ] **Step 1: Write the failing promo test**

```ts
import { describe, expect, it } from "vitest";
import { activeOfferCode, isPromoLive } from "./promoOffer";

const base = { externalOfferCode: "base", promoOfferCode: null, promoEndsAt: null };

describe("promo offers", () => {
    it("uses the base offer when no promo is set", () => {
        expect(activeOfferCode(base)).toBe("base");
    });

    it("uses the promo when set with no end date", () => {
        expect(activeOfferCode({ ...base, promoOfferCode: "promo" })).toBe("promo");
    });

    it("uses the promo while the end date is in the future", () => {
        const future = new Date(Date.now() + 86_400_000);
        expect(activeOfferCode({ ...base, promoOfferCode: "promo", promoEndsAt: future })).toBe("promo");
    });

    // Expiry is evaluated at read time so a promo lapses on its own, with no
    // scheduled job to forget to run.
    it("falls back to the base offer once the promo has expired", () => {
        const past = new Date(Date.now() - 1000);
        expect(activeOfferCode({ ...base, promoOfferCode: "promo", promoEndsAt: past })).toBe("base");
        expect(isPromoLive({ ...base, promoOfferCode: "promo", promoEndsAt: past })).toBe(false);
    });
});
```

- [ ] **Step 2: Run it, watch it fail, implement, run again**

- [ ] **Step 3: Extend the product zod schema**

Add the three code fields plus the promo trio, all optional/nullable. Add a refinement: `promoPriceInDollars` and `promoEndsAt` are meaningless without `promoOfferCode`.

- [ ] **Step 4: Replace the sync calls in `db/products.ts`**

Delete the `createStripeProduct` / `updateStripeProduct` / `archiveStripeProduct` imports and calls. In their place, `insertProduct` and `updateProduct` verify `externalProductId` against `getHotmartProduct` when one is supplied, and throw a Spanish error naming the field when it does not resolve. `deleteProduct` no longer archives anything — there is no API for it, and Hotmart's dashboard is the place that owns product lifecycle now.

- [ ] **Step 5: Add the fields to the admin form**

Three text inputs under a "Hotmart" heading, plus the promo trio. All optional, so a product can still be drafted before its Hotmart counterpart exists.

- [ ] **Step 6: Delete the Stripe sync and commit**

```bash
git rm src/app/features/products/lib/stripeProducts.ts
pnpm test && pnpm build
git add -A && git commit -m "feat: Hotmart product codes in the admin, replacing the sync"
```

---

### Task 5: Checkout

**Files:**
- Create: `src/app/features/purchases/lib/checkoutLink.ts`, `checkoutLink.test.ts`
- Create: `src/app/features/purchases/actions/hotmart.ts`
- Delete: `src/app/features/purchases/actions/stripe.ts`
- Modify: `src/app/features/purchases/components/CheckoutButton.tsx`
- Create: `src/app/(consumer)/purchase/success/page.tsx`, `pending/page.tsx`

**Interfaces:**
- Produces: `buildCheckoutUrl({ checkoutCode, offerCode, email, name, userId }): string`, `startCheckout(productId: string): Promise<never>`

- [ ] **Step 1: Write the failing URL test**

```ts
import { describe, expect, it } from "vitest";
import { buildCheckoutUrl } from "./checkoutLink";

describe("buildCheckoutUrl", () => {
    it("builds a Hotmart checkout URL with the offer and buyer prefilled", () => {
        const url = new URL(buildCheckoutUrl({
            checkoutCode: "W12345678X",
            offerCode: "a1b2c3d4",
            email: "ana@example.com",
            name: "Ana Pérez",
            userId: "user-uuid",
        }));

        expect(url.origin + url.pathname).toBe("https://pay.hotmart.com/W12345678X");
        expect(url.searchParams.get("off")).toBe("a1b2c3d4");
        expect(url.searchParams.get("email")).toBe("ana@example.com");
        // sck is the ONLY custom channel Hotmart offers; it returns as
        // purchase.origin.sck and is how the webhook finds the buyer's account.
        expect(url.searchParams.get("sck")).toBe("user-uuid");
    });

    it("escapes names with spaces and accents", () => {
        const url = buildCheckoutUrl({
            checkoutCode: "W1", offerCode: "o1",
            email: "a@b.c", name: "José Ñandú", userId: "u1",
        });
        expect(url).toContain("Jos%C3%A9");
        expect(url).not.toContain(" ");
    });
});
```

- [ ] **Step 2: Run, fail, implement, pass**

- [ ] **Step 3: Rewrite the action**

`startCheckout(productId)` keeps its guards — redirect to `/login` when signed out, redirect to `/products` when already owned, throw when the product has no Hotmart codes. It no longer takes `formData`: Hotmart's checkout has its own coupon field, so the `discountMode` branch and the `getUserCoupon` call both go.

- [ ] **Step 4: Simplify `CheckoutButton`**

Drop `DiscountCodeSwitch` entirely and change the notice to name Hotmart. `action={startCheckout.bind(null, productId)}` still works with the one-argument signature.

- [ ] **Step 5: Write the two landing pages**

`/purchase/success` is authenticated. It checks whether the webhook has landed; if so it forwards to the product success page, otherwise it renders "Estamos confirmando tu pago" and polls. It must not depend on any query parameter, because whether Hotmart appends one to an external thank-you URL is undocumented.

- [ ] **Step 6: Delete the Stripe action, build, commit**

```bash
git rm src/app/features/purchases/actions/stripe.ts
pnpm test && pnpm build
git add -A && git commit -m "feat: Hotmart checkout links and post-payment pages"
```

---

### Task 6: The webhook

**Files:**
- Create: `src/lib/webhookDedupe.ts`
- Create: `src/app/api/webhooks/hotmart/route.ts`, `handlers.ts`, `route.test.ts`, `handlers.test.ts`
- Delete: `src/app/api/webhooks/stripe/route.ts`

**Interfaces:**
- Produces: `alreadyProcessed(trx, eventId, eventType): Promise<boolean>`, `handlePurchaseApproved(event)`, `handlePurchaseRefunded(event)`, `handleSubscriptionEvent(event)`

- [ ] **Step 1: Write the failing hottok tests**

```ts
it("rejects a request with no hottok", async () => {
    const res = await POST(new Request("https://x/api/webhooks/hotmart", {
        method: "POST", body: JSON.stringify({ event: "PURCHASE_APPROVED" }),
    }));
    expect(res.status).toBe(403);
});

it("rejects a wrong hottok", async () => {
    const res = await POST(new Request("https://x/api/webhooks/hotmart", {
        method: "POST",
        headers: { "x-hotmart-hottok": "not-the-token" },
        body: JSON.stringify({ event: "PURCHASE_APPROVED" }),
    }));
    expect(res.status).toBe(403);
});
```

- [ ] **Step 2: Implement verification**

`crypto.timingSafeEqual` over equal-length buffers, never `===`. A fixed secret compared on every request is precisely where a naive comparison leaks. Length mismatch short-circuits to false before the compare, since `timingSafeEqual` throws on unequal lengths.

- [ ] **Step 3: Write the handler tests**

Cover: `sck` resolves the user; a missing `sck` falls back to `buyer.email`; an unknown buyer throws rather than silently dropping; the purchase row and access grant commit together; a replayed event id is a no-op; a refund stamps `refundedAt` before revoking.

- [ ] **Step 4: Implement the handlers**

Port the structure from the Stripe route — it is the best part of the current integration and none of it is Stripe-specific. Preserve: one transaction for purchase plus access, `refundedAt` stamped before revocation, the frozen `productDetails` copy, `pricePaidInCents` from what was actually collected.

`alreadyProcessed` takes the transaction so the dedupe row rolls back with the work on failure.

Re-verify `PURCHASE_APPROVED` against `getHotmartSale` before granting. One call per purchase, and it makes a forged event worthless.

- [ ] **Step 5: Delete the Stripe webhook, test, commit**

```bash
git rm -r src/app/api/webhooks/stripe
pnpm test && pnpm build
git add -A && git commit -m "feat: Hotmart webhook replacing the Stripe route"
```

---

### Task 7: Subscriptions behind the flag

**Files:**
- Modify: `src/app/features/subscriptions/lib/plans.ts`, `actions/subscriptions.ts`, `db/subscriptions.ts`
- Modify: the four subscription routes and the components that link to them

- [ ] **Step 1: Rewrite `plans.ts`**

Prices come from env, not from the provider — Hotmart exposes no endpoint returning an offer's price. Returns `null` when subscriptions are disabled, so callers have one obvious branch.

- [ ] **Step 2: Gate the routes**

`/subscribe`, `/subscribe/categories/[categoryId]`, `/subscription`, `/subscription-management` call `notFound()` when `!env.SUBSCRIPTIONS_ENABLED`.

- [ ] **Step 3: Hide the entry points**

`CourseUpgradeOffer` and `SubscriptionCourseCard` render nothing; remove the nav links.

- [ ] **Step 4: Repoint `upsertSubscription`**

New column names, and `onConflictDoUpdate` targets `externalSubscriptionId`.

- [ ] **Step 5: Test, build, commit**

```bash
pnpm test && pnpm build
git add -A && git commit -m "feat: subscriptions on Hotmart, disabled at launch"
```

---

### Task 8: Receipts, refunds, and removing Stripe

**Files:**
- Modify: `src/app/features/purchases/lib/receiptDetails.ts`, `actions/purchases.ts`, both receipt pages, `db/adminPurchases.ts`
- Delete: `src/lib/stripe.ts`, `src/app/features/countryGroups/`, `src/app/features/products/lib/ppp.ts`, `src/drizzle/backfillPppCoupons.mjs`, `src/app/admin/country-groups/`
- Modify: `src/data/env/server.ts`, `src/test/setup.ts`, `package.json`, `.github/workflows/deploy-hetzner.yml`, `deploy/README.md`

- [ ] **Step 1: Rewrite `receiptDetails.ts`**

Keep `getPricingRows` verbatim — that arithmetic is provider-agnostic and is what keeps the buyer's page and the admin's page agreeing. Replace everything above it with one `getHotmartSale` call. Delete `getLatestCharge`, `getDiscountRows`, `resolveCoupon`. Keep the outer fallback: both pages still render from local data when Hotmart is unreachable.

- [ ] **Step 2: Repoint the refund action**

`refundHotmartSale(orderId)`. Preserve the ordering and its comment — provider, then purchases, then access.

- [ ] **Step 3: Delete Stripe and PPP**

```bash
pnpm remove stripe
git rm -r src/lib/stripe.ts src/app/features/countryGroups src/app/admin/country-groups \
         src/app/features/products/lib/ppp.ts src/drizzle/backfillPppCoupons.mjs
```

Remove `db:backfill-coupons` from `package.json` and the four `STRIPE_*` from the env schema, `src/test/setup.ts`, and the deploy workflow.

- [ ] **Step 4: Prove it is gone**

```bash
grep -rn -i "stripe\|polar" src/ --include='*.ts' --include='*.tsx' --include='*.mjs' | grep -v 'drizzle/migrations'
```

Expected: no output. Migration files legitimately keep old names — they are history.

- [ ] **Step 5: Full check and commit**

```bash
pnpm test && pnpm build && pnpm lint
git add -A && git commit -m "feat: Hotmart receipts and refunds; remove Stripe and PPP"
```

---

### Task 9: Verification

- [ ] **Step 1:** `pnpm build && pnpm test && pnpm lint` all green.
- [ ] **Step 2:** App boots with `SUBSCRIPTIONS_ENABLED=false` and no `ALL_ACCESS` variables.
- [ ] **Step 3:** Subscription routes 404; no subscription UI anywhere.
- [ ] **Step 4:** Setting `SUBSCRIPTIONS_ENABLED=true` without the eight variables fails at boot.
- [ ] **Step 5:** Blocked on Hotmart approval — the real purchase with the 100% coupon.
