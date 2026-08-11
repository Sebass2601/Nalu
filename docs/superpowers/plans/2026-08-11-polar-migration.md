# Polar Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace Stripe with Polar as the payment provider, end to end, leaving no Stripe import in the codebase.

**Architecture:** A clean rip-and-replace — production holds 0 purchases and 0 subscriptions, so nothing needs to survive the change. Provider-specific code is confined to four files (`lib/polar.ts`, `polarProducts.ts`, the checkout action, the webhook route) so a future provider swap touches those rather than the ~46 files that currently mention Stripe. Every task leaves the build green and the tests passing.

**Tech Stack:** Next.js 16 (App Router, `cacheComponents`), Drizzle ORM, Postgres 17, Vitest, `@polar-sh/sdk`.

## Global Constraints

- Package manager is **pnpm**. Never `npm`.
- This Next.js version has breaking changes from training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing framework code. Middleware is `src/proxy.ts`, not `middleware.ts`.
- Build against **production** Polar (`POLAR_SERVER=production`). There is no sandbox org.
- **Never** test with a real card. Use a 100% discount code.
- **Never** pass `organization_id` to Polar create calls — the org token is already scoped and it returns 422.
- Currency is **USD only**.
- All five `POLAR_*` variables already exist in `.env` and are verified working (token returned HTTP 200, both subscription products exist).
- Stripe env vars stay in the schema until Task 7 so the build never breaks mid-migration.
- Commit after every task. Branch: `feat/polar-migration`.

---

### Task 1: Polar client, env schema, test fixtures

Adds Polar alongside Stripe. Nothing is removed yet, so the build stays green.

**Files:**
- Create: `src/lib/polar.ts`
- Create: `src/lib/polar.test.ts`
- Modify: `src/data/env/server.ts`
- Modify: `src/test/setup.ts`

**Interfaces:**
- Consumes: nothing
- Produces: `polar` (a `Polar` client instance), `dollarsToCents(dollars: number): number`

- [ ] **Step 1: Install the SDK**

```bash
pnpm add @polar-sh/sdk
```

- [ ] **Step 2: Add the Polar variables to the env schema**

In `src/data/env/server.ts`, inside the `server: { ... }` block, after the Stripe section:

```ts
        // --- Polar ---------------------------------------------------------
        // Polar is the merchant of record: legally the seller, so it collects
        // and remits VAT worldwide and pays out via Stripe Connect Express.
        // The access token is organization-scoped, which is why no call in this
        // codebase passes an organization_id (doing so returns 422).
        POLAR_ACCESS_TOKEN: z.string().min(1),
        POLAR_WEBHOOK_SECRET: z.string().min(1),

        // Which Polar environment to talk to. Sandbox and production are wholly
        // separate — different organizations, tokens, products and webhook
        // endpoints — so this is never merely cosmetic.
        POLAR_SERVER: z.enum(["sandbox", "production"]).default("production"),

        // The all-access plan. Two products rather than two prices on one:
        // Polar locks the billing cycle at creation, so monthly and yearly are
        // necessarily separate products.
        POLAR_ALL_ACCESS_MONTHLY_PRODUCT_ID: z.string().min(1),
        POLAR_ALL_ACCESS_YEARLY_PRODUCT_ID: z.string().min(1),
```

- [ ] **Step 3: Add the test fixtures**

In `src/test/setup.ts`, add to the `testEnv` object:

```ts
    POLAR_ACCESS_TOKEN: "polar_at_dummy",
    POLAR_WEBHOOK_SECRET: "polar_whs_dummy",
    POLAR_SERVER: "sandbox",
    POLAR_ALL_ACCESS_MONTHLY_PRODUCT_ID: "00000000-0000-0000-0000-000000000001",
    POLAR_ALL_ACCESS_YEARLY_PRODUCT_ID: "00000000-0000-0000-0000-000000000002",
```

- [ ] **Step 4: Write the failing test**

Create `src/lib/polar.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { dollarsToCents } from "./polar";

// Money is held as integer cents because binary floating point cannot
// represent 0.1 exactly. 60.10 is the case that catches a naive `* 100`.
describe("dollarsToCents", () => {
    it("converts whole dollars", () => {
        expect(dollarsToCents(60)).toBe(6000);
    });

    it("rounds rather than truncating", () => {
        expect(dollarsToCents(60.1)).toBe(6010);
        expect(dollarsToCents(0.07)).toBe(7);
    });

    it("handles zero", () => {
        expect(dollarsToCents(0)).toBe(0);
    });
});
```

- [ ] **Step 5: Run it and watch it fail**

```bash
pnpm test src/lib/polar.test.ts
```

Expected: FAIL — cannot resolve `./polar`.

- [ ] **Step 6: Write the client**

Create `src/lib/polar.ts`:

```ts
import "server-only";

import { Polar } from "@polar-sh/sdk";
import { env } from "@/data/env/server";

// Single, shared Polar client — the same pattern as `aj` in ./arcjet.ts and the
// Stripe client it replaces. One instance keeps the access token and the target
// environment in exactly one place.
//
// `server-only` makes the build fail if this module is ever imported from a
// client component. That import is the guardrail that stops the access token
// being bundled into browser JavaScript.
//
// `server` comes from env rather than a literal so that moving between Polar's
// sandbox and production is an environment change, never a code change. The two
// are entirely separate accounts, so pointing at the wrong one fails loudly
// with 401 rather than quietly doing something unintended.
export const polar = new Polar({
    accessToken: env.POLAR_ACCESS_TOKEN,
    server: env.POLAR_SERVER,
});

// Polar holds every amount as an integer in the currency's smallest unit —
// cents for USD — because binary floating point cannot represent 0.1 exactly
// and money must never round wrong. Products in this project store whole
// dollars (`ProductTable.priceInDollars` is an `integer`), so this is the one
// place that conversion should happen.
export function dollarsToCents(dollars: number) {
    return Math.round(dollars * 100);
}
```

- [ ] **Step 7: Run the tests**

```bash
pnpm test
```

Expected: PASS, including the pre-existing suites.

- [ ] **Step 8: Verify the build still compiles**

```bash
pnpm build
```

Expected: succeeds. Stripe is untouched so far.

- [ ] **Step 9: Commit**

```bash
git add package.json pnpm-lock.yaml src/lib/polar.ts src/lib/polar.test.ts src/data/env/server.ts src/test/setup.ts
git commit -m "feat: add the Polar client alongside Stripe"
```

---

### Task 2: Schema — rename the identifier columns

Renames every Stripe identifier column to its Polar equivalent and repoints all ~30 reading sites. The code still calls Stripe at this point; only the column names change, so the build stays green.

**Files:**
- Modify: `src/drizzle/schema/product.ts`, `purchase.ts`, `user.ts`, `subscription.ts`, `countryGroup.ts`
- Create: `src/drizzle/schema/processedWebhook.ts`
- Modify: `src/drizzle/schema.ts` (export the new table)
- Create: `src/drizzle/migrations/00XX_*.sql` (generated)
- Modify: every file TypeScript reports as broken

**Interfaces:**
- Produces: `ProductTable.polarProductId`, `PurchaseTable.polarCheckoutId`, `PurchaseTable.polarOrderId`, `PurchaseTable.buyerCountry`, `SubscriptionTable.polarSubscriptionId`, `SubscriptionTable.polarProductId`, `CountryGroupTable.polarDiscountId`, `ProcessedWebhookTable`

- [ ] **Step 1: Edit `product.ts`**

Replace the two Stripe columns with one:

```ts
    // The mirror of this product inside Polar. `priceInDollars` above stays
    // the display price; this is what checkout actually bills against.
    //
    // One column where Stripe needed two. Stripe splits product and price into
    // separate objects with a Price that can never be edited, so raising a
    // price meant creating a new Price and archiving the old. Polar gives each
    // product a single pricing model and lets the amount be edited in place,
    // so the ID stays stable across repricing.
    //
    // Nullable because a product can be drafted before it is ever pushed to
    // Polar, and because a failed sync must not block saving.
    polarProductId: text(),
```

- [ ] **Step 2: Edit `purchase.ts`**

```ts
    polarCheckoutId: text().notNull().unique(),
    // The Order behind this purchase. Refund events arrive keyed by order
    // rather than by checkout, so without this column `order.refunded` cannot
    // be matched back to the row it should mark as refunded.
    polarOrderId: text(),
    // ISO country of the buyer, as Polar determined it for its own VAT
    // purposes. Kept because Panamanian tax treatment turns on whether revenue
    // is foreign-source, and that question is answered per sale. Reconstructing
    // it later from bank statements is not realistic.
    buyerCountry: text(),
```

- [ ] **Step 3: Edit `user.ts`**

Delete the `stripeCustomerId` line entirely. Polar takes an `externalCustomerId` — the app's own user ID — and creates or finds the matching customer itself, so there is nothing to store.

- [ ] **Step 4: Edit `subscription.ts`**

Replace the three Stripe columns with two:

```ts
    polarSubscriptionId: text().notNull().unique(),
    polarProductId: text().notNull(),
```

`stripeCustomerId` goes for the same reason as on `users`.

- [ ] **Step 5: Edit `countryGroup.ts`**

```ts
    // The Polar discount to apply for buyers in this group. Unused while PPP
    // is display-only — see the migration, which nulls the Stripe coupon IDs
    // that four of these rows still carry.
    polarDiscountId: text(),
```

- [ ] **Step 6: Create the webhook dedupe table**

Create `src/drizzle/schema/processedWebhook.ts`:

```ts
import { pgTable, text, timestamp } from "drizzle-orm/pg-core";

// One row per webhook delivery already handled.
//
// The handlers are idempotent by design, so this is defence in depth rather
// than the primary guarantee. It exists because the Standard Webhooks spec
// gives every delivery a unique `webhook-id`, and skipping a repeat is cheaper
// and clearer than relying on every downstream write staying idempotent
// forever.
//
// Keyed on the header value, NOT on the event or order ID: Polar can deliver
// the same event more than once, and those retries share an event ID while
// carrying distinct delivery IDs.
export const ProcessedWebhookTable = pgTable("processed_webhooks", {
    webhookId: text().primaryKey(),
    eventType: text().notNull(),
    processedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
});
```

Export it from `src/drizzle/schema.ts` alongside the other tables.

- [ ] **Step 7: Generate the migration**

```bash
pnpm db:generate
```

When drizzle-kit asks whether each column is a rename or a drop-and-create, answer **rename** for `stripeProductId`→`polarProductId`, `stripeSessionId`→`polarCheckoutId`, `stripePaymentIntentId`→`polarOrderId`, `stripeSubscriptionId`→`polarSubscriptionId`, `stripePriceId`→`polarProductId`, `stripeCouponId`→`polarDiscountId`.

- [ ] **Step 8: Read the generated SQL and add the null**

Open the new file in `src/drizzle/migrations/`. Confirm it uses `ALTER TABLE ... RENAME COLUMN` and not `DROP` + `ADD`, and that `users.stripeCustomerId`, `subscriptions.stripeCustomerId` and `products.stripePriceId` are dropped.

Then append, with the comment:

```sql
--> statement-breakpoint
-- Four country groups still hold real Stripe sandbox coupon IDs. Renaming the
-- column without clearing it would leave Stripe identifiers sitting in a column
-- named for Polar — a trap that only springs later, when PPP is wired and the
-- code hands Polar a coupon it has never heard of.
UPDATE "country_groups" SET "polarDiscountId" = NULL;
```

- [ ] **Step 9: Let TypeScript list every broken site**

```bash
pnpm build
```

Expected: FAIL, with an error per file still naming an old column. Work through them, renaming reads and writes. The call sites still use the Stripe SDK — only the property names change.

- [ ] **Step 10: Build and test until green**

```bash
pnpm build && pnpm test
```

Expected: both pass.

- [ ] **Step 11: Apply the migration locally**

```bash
pnpm db:migrate
```

- [ ] **Step 12: Commit**

```bash
git add src/drizzle package.json
git add -A
git commit -m "feat: rename the Stripe identifier columns to Polar"
```

---

### Task 3: Product sync

Ports `stripeProducts.ts`. The admin panel keeps creating the provider-side product on save, and keeps self-healing when the stored ID belongs to a different environment.

**Files:**
- Create: `src/app/features/products/lib/polarProducts.ts`
- Create: `src/app/features/products/lib/polarProducts.test.ts`
- Modify: `src/app/features/products/db/products.ts`
- Delete: `src/app/features/products/lib/stripeProducts.ts`

**Interfaces:**
- Consumes: `polar`, `dollarsToCents` from `@/lib/polar`
- Produces:
  - `createPolarProduct(product: ProductFields): Promise<{ polarProductId: string }>`
  - `updatePolarProduct(product: ProductFields & { polarProductId: string | null }): Promise<{ polarProductId: string }>`
  - `archivePolarProduct(polarProductId: string): Promise<void>`
  - `type ProductFields = { name: string; description: string; imageUrl: string; priceInDollars: number; status?: productStatus }`

- [ ] **Step 1: Read the SDK's product surface**

```bash
grep -rn "products" node_modules/@polar-sh/sdk/docs/sdks/ | head -30
```

Confirm the exact method names and argument shape for create, update and list before writing. Do not guess: the SDK uses camelCase where the HTTP API uses snake_case.

- [ ] **Step 2: Write the failing test**

Create `src/app/features/products/lib/polarProducts.test.ts`:

```ts
import { beforeEach, describe, expect, it, vi } from "vitest";

const create = vi.fn();
const update = vi.fn();

vi.mock("@/lib/polar", () => ({
    polar: { products: { create, update } },
    dollarsToCents: (d: number) => Math.round(d * 100),
}));

const { updatePolarProduct } = await import("./polarProducts");

beforeEach(() => {
    create.mockReset();
    update.mockReset();
});

describe("updatePolarProduct", () => {
    // A product drafted before the sync existed, or whose earlier sync failed,
    // has no counterpart to reconcile against.
    it("creates from scratch when there is no stored id", async () => {
        create.mockResolvedValue({ id: "prod_new" });

        const result = await updatePolarProduct({
            name: "Curso",
            description: "d",
            imageUrl: "https://example.com/i.png",
            priceInDollars: 60,
            polarProductId: null,
        });

        expect(create).toHaveBeenCalledOnce();
        expect(update).not.toHaveBeenCalled();
        expect(result).toEqual({ polarProductId: "prod_new" });
    });

    // The stored ID names an object this organization has never heard of — the
    // ordinary cause being an ID minted against a different Polar environment.
    // Recreating is the only way forward and is safe: the unreachable object is
    // not ours to orphan.
    it("recreates when the stored id belongs to another environment", async () => {
        update.mockRejectedValue(Object.assign(new Error("not found"), { statusCode: 404 }));
        create.mockResolvedValue({ id: "prod_recreated" });

        const result = await updatePolarProduct({
            name: "Curso",
            description: "d",
            imageUrl: "https://example.com/i.png",
            priceInDollars: 60,
            polarProductId: "prod_from_elsewhere",
        });

        expect(create).toHaveBeenCalledOnce();
        expect(result).toEqual({ polarProductId: "prod_recreated" });
    });

    it("updates in place when the product exists", async () => {
        update.mockResolvedValue({ id: "prod_existing" });

        const result = await updatePolarProduct({
            name: "Curso renombrado",
            description: "d",
            imageUrl: "https://example.com/i.png",
            priceInDollars: 75,
            polarProductId: "prod_existing",
        });

        expect(create).not.toHaveBeenCalled();
        expect(result).toEqual({ polarProductId: "prod_existing" });
    });
});
```

- [ ] **Step 3: Run it and watch it fail**

```bash
pnpm test src/app/features/products/lib/polarProducts.test.ts
```

Expected: FAIL — cannot resolve `./polarProducts`.

- [ ] **Step 4: Write `polarProducts.ts`**

Mirror the structure of `stripeProducts.ts`, minus the Price dance. Keep these three behaviours, which are the reason that file exists:

1. A private product is archived in Polar too, so it cannot be bought by anyone who reaches a checkout for it.
2. Image URLs are resolved to absolute against `env.SERVER_URL` — Polar fetches them itself, so a relative path means nothing.
3. A 404 on update means the ID belongs to another environment: recreate rather than fail.

Set product visibility **explicitly** rather than relying on a default, so auto-created products match the subscription products created by hand.

There is no tax-code equivalent: Polar is the merchant of record and classifies for tax itself. Drop `ONLINE_COURSE_TAX_CODE`.

- [ ] **Step 5: Run the tests**

```bash
pnpm test src/app/features/products/lib/polarProducts.test.ts
```

Expected: PASS.

- [ ] **Step 6: Repoint `products.ts`**

In `src/app/features/products/db/products.ts`, swap the three imports and the two call sites (`insertProduct`, `updateProduct`). Keep the existing ordering comments — provider first, database second, both outside the transaction — because the reasoning is unchanged.

- [ ] **Step 7: Delete the Stripe version**

```bash
git rm src/app/features/products/lib/stripeProducts.ts
```

- [ ] **Step 8: Build and test**

```bash
pnpm build && pnpm test
```

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "feat: sync products to Polar instead of Stripe"
```

---

### Task 4: One-time purchase checkout

**Files:**
- Create: `src/app/api/checkout/route.ts`
- Modify: `src/app/features/purchases/actions/stripe.ts` → rename to `polar.ts`
- Modify: `src/app/features/purchases/components/CheckoutButton.tsx`

**Interfaces:**
- Consumes: `polar`, `ProductTable.polarProductId`
- Produces: `startCheckout(productId: string, formData: FormData)` — unchanged signature, so callers do not move

- [ ] **Step 1: Read the checkout API shape**

```bash
grep -rn "checkouts" node_modules/@polar-sh/sdk/docs/sdks/ | head -20
```

Confirm the argument names for `polar.checkouts.create` before writing.

- [ ] **Step 2: Build the checkout session**

Required arguments, per the spec:

```ts
const checkout = await polar.checkouts.create({
    products: [product.polarProductId],
    externalCustomerId: userId,       // links to the app's own user, no local column
    customerEmail: user.email,
    successUrl: `${env.SERVER_URL}/api/webhooks/polar?checkoutId={CHECKOUT_ID}`,
    metadata: { userId, productId },
    customerIpAddress: buyerIp,       // see the next step — this one matters
});
```

- [ ] **Step 3: Forward the buyer's IP**

**This is the failure the spec calls out.** Sessions are created server-side, so Polar reads the *server's* address and places every buyer in Germany, where the Hetzner box lives. Read the real client IP from the forwarded headers Caddy already sets:

```ts
// Caddy sets X-Forwarded-For; the client address is the first entry. Without
// this, Polar geolocates the server rather than the buyer — the same
// behind-a-proxy failure as the auth base URL and the Arcjet country header.
const forwarded = request.headers.get("x-forwarded-for");
const buyerIp = forwarded?.split(",")[0]?.trim();
```

- [ ] **Step 4: Redirect**

```ts
return Response.redirect(checkout.url, 302);
```

- [ ] **Step 5: Rename the action file**

```bash
git mv src/app/features/purchases/actions/stripe.ts src/app/features/purchases/actions/polar.ts
```

Update the import in `CheckoutButton.tsx`. Keep `startCheckout`'s signature so nothing else moves.

- [ ] **Step 6: Build and test**

```bash
pnpm build && pnpm test
```

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: create Polar checkout sessions for one-time purchases"
```

---

### Task 5: Subscriptions and the customer portal

**Files:**
- Modify: `src/app/features/subscriptions/actions/subscriptions.ts`
- Modify: `src/app/features/subscriptions/lib/plans.ts`
- Modify: `src/app/features/subscriptions/db/subscriptions.ts`
- Modify: `src/app/(consumer)/subscription-management/page.tsx`

**Interfaces:**
- Consumes: `polar`, `env.POLAR_ALL_ACCESS_{MONTHLY,YEARLY}_PRODUCT_ID`
- Produces: `startSubscriptionCheckout(interval: string)`, `openBillingPortal()`, `upsertSubscription({ userId, polarSubscriptionId, polarProductId, interval, status, currentPeriodEnd, cancelAtPeriodEnd })`

- [ ] **Step 1: Map Polar's subscription statuses to the local enum**

```bash
grep -rn "SubscriptionStatus" node_modules/@polar-sh/sdk/dist/esm/models/components/ | head -10
```

Read the actual union. `subscriptionStatuses` in `src/drizzle/schema/subscription.ts` currently mirrors Stripe's vocabulary. **Do not assume the two match.** Where Polar has a status the enum lacks, add it in a follow-up migration; where the enum has one Polar never sends, leave it — an unused enum value is harmless, a missing one is a crash.

- [ ] **Step 2: Point checkout at the two products**

`startSubscriptionCheckout` currently selects a Stripe price ID by interval. Select a Polar product ID instead, from the two env variables. Same `externalCustomerId`, `metadata` and `customerIpAddress` as Task 4.

- [ ] **Step 3: Replace the billing portal**

`openBillingPortal` currently creates a Stripe billing-portal session. Polar hosts its portal and emails customers a link; the app should create an authenticated portal session for the current user and redirect. Check the SDK:

```bash
grep -rn "customerSessions\|customerPortal" node_modules/@polar-sh/sdk/docs/sdks/ | head -10
```

- [ ] **Step 4: Update `upsertSubscription`**

Change the parameter object to `polarSubscriptionId` / `polarProductId`, drop `stripeCustomerId`, and repoint `onConflictDoUpdate` at `SubscriptionTable.polarSubscriptionId`.

- [ ] **Step 5: Build and test**

```bash
pnpm build && pnpm test
```

Expected: `subscriptionAccess.test.ts` still passes — it tests access derivation, which is provider-agnostic.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: move subscriptions and the billing portal to Polar"
```

---

### Task 6: Webhooks

The heart of it. Keep the current handler's structure — it is the best part of the existing integration and none of it is Stripe-specific.

**Files:**
- Create: `src/app/api/webhooks/polar/route.ts`
- Create: `src/app/api/webhooks/polar/route.test.ts`
- Create: `src/lib/webhookDedupe.ts`
- Delete: `src/app/api/webhooks/stripe/route.ts`

**Interfaces:**
- Consumes: `validateEvent`, `WebhookVerificationError` from `@polar-sh/sdk/webhooks`; `ProcessedWebhookTable`
- Produces: `alreadyProcessed(webhookId: string, eventType: string): Promise<boolean>`

- [ ] **Step 1: Write the dedupe helper**

Create `src/lib/webhookDedupe.ts`:

```ts
import "server-only";

import { db } from "@/drizzle/db";
import { ProcessedWebhookTable } from "@/drizzle/schema";

// Records this delivery and reports whether it had already been seen.
//
// Keyed on the `webhook-id` HEADER, not the event or order ID. Polar retries
// deliveries, and retries of one event share its event ID while carrying
// distinct delivery IDs — so deduplicating on the event would silently drop
// legitimate redeliveries after a transient failure.
//
// `onConflictDoNothing` returns an empty array when the row already existed,
// which is the signal. One statement, no read-then-write race.
export async function alreadyProcessed(webhookId: string, eventType: string) {
    const inserted = await db
        .insert(ProcessedWebhookTable)
        .values({ webhookId, eventType })
        .onConflictDoNothing()
        .returning({ webhookId: ProcessedWebhookTable.webhookId });

    return inserted.length === 0;
}
```

- [ ] **Step 2: Write the failing signature test**

Create `src/app/api/webhooks/polar/route.test.ts`:

```ts
import { describe, expect, it, vi } from "vitest";

vi.mock("@/drizzle/db", () => ({ db: {} }));
vi.mock("@/lib/webhookDedupe", () => ({ alreadyProcessed: vi.fn() }));

const { POST } = await import("./route");

describe("Polar webhook", () => {
    // Anyone can POST here; only Polar can produce a valid signature. A 4xx
    // tells Polar not to retry, because a forged or malformed request will
    // never become valid.
    it("rejects a request with no signature headers", async () => {
        const response = await POST(
            new Request("https://naluescuela.com/api/webhooks/polar", {
                method: "POST",
                body: JSON.stringify({ type: "order.paid" }),
            })
        );

        expect(response.status).toBe(403);
    });

    it("rejects a forged signature", async () => {
        const response = await POST(
            new Request("https://naluescuela.com/api/webhooks/polar", {
                method: "POST",
                headers: {
                    "webhook-id": "msg_1",
                    "webhook-timestamp": String(Math.floor(Date.now() / 1000)),
                    "webhook-signature": "v1,not-a-real-signature",
                },
                body: JSON.stringify({ type: "order.paid" }),
            })
        );

        expect(response.status).toBe(403);
    });
});
```

- [ ] **Step 3: Run it and watch it fail**

```bash
pnpm test src/app/api/webhooks/polar/route.test.ts
```

Expected: FAIL — cannot resolve `./route`.

- [ ] **Step 4: Write the route**

```ts
import { validateEvent, WebhookVerificationError } from "@polar-sh/sdk/webhooks";
import { env } from "@/data/env/server";
import { alreadyProcessed } from "@/lib/webhookDedupe";

export async function POST(request: Request): Promise<Response> {
    // Signature verification needs the EXACT bytes Polar signed, so the body is
    // read as text and never parsed to JSON first — re-serialising an object
    // changes key order and whitespace and would invalidate the signature.
    const body = await request.text();

    let event: ReturnType<typeof validateEvent>;
    try {
        event = validateEvent(
            body,
            {
                "webhook-id": request.headers.get("webhook-id") ?? "",
                "webhook-timestamp": request.headers.get("webhook-timestamp") ?? "",
                "webhook-signature": request.headers.get("webhook-signature") ?? "",
            },
            env.POLAR_WEBHOOK_SECRET
        );
    } catch (error) {
        if (error instanceof WebhookVerificationError) {
            return Response.json({ received: false }, { status: 403 });
        }
        throw error;
    }

    const webhookId = request.headers.get("webhook-id") ?? "";
    if (await alreadyProcessed(webhookId, event.type)) {
        return Response.json({ received: true, duplicate: true });
    }

    try {
        switch (event.type) {
            case "order.paid":
                await processPolarOrder(event.data);
                break;
            case "order.refunded":
                await processPolarRefund(event.data);
                break;
            case "subscription.created":
            case "subscription.active":
            case "subscription.updated":
            case "subscription.canceled":
            case "subscription.revoked":
            case "subscription.past_due":
                await processPolarSubscription(event.data);
                break;
        }
    } catch (error) {
        // A 500 asks Polar to retry with backoff. That is the right answer for
        // a transient failure such as the database being briefly unavailable —
        // the payment already happened, so giving up would silently rob the
        // buyer of what they paid for.
        console.error(`[polar] failed handling ${event.type}:`, error);
        return Response.json({ received: false }, { status: 500 });
    }

    return Response.json({ received: true });
}
```

- [ ] **Step 4b: Export a `GET` for the buyer's return trip**

The old route exported both verbs and documented why: `POST` is Polar's
server-to-server call, authoritative and retried; `GET` is the buyer's own
browser, arriving via `successUrl`, which provisions immediately so they are not
staring at a "you own nothing" page while the webhook is still in flight. Both
funnel into the same idempotent handler.

`successUrl` in Task 4 points here, so without this export the buyer lands on a
404 after paying.

```ts
export async function GET(request: Request): Promise<Response> {
    const checkoutId = new URL(request.url).searchParams.get("checkoutId");
    if (checkoutId == null) return redirectTo("/products/purchase-failure", request);

    try {
        const checkout = await polar.checkouts.get({ id: checkoutId });
        const productId = await processPolarCheckoutReturn(checkout);
        return redirectTo(
            productId == null ? "/subscription" : `/products/${productId}/success`,
            request
        );
    } catch (error) {
        console.error("[polar] return_url handling failed:", error);
        return redirectTo("/products/purchase-failure", request);
    }
}
```

Note this path must **not** consult `alreadyProcessed` — that guards webhook
deliveries, and the browser's return carries no `webhook-id`. Idempotency in the
shared handler is what makes running twice safe.

- [ ] **Step 4c: Port the three handlers**

Port `processStripeCheckout`, `processStripeSubscription` and `processStripeRefund` from the old route (recover it with `git show HEAD:src/app/api/webhooks/stripe/route.ts` if already deleted) as `processPolarOrder`, `processPolarSubscription` and `processPolarRefund`, preserving:

- purchase row and course access written in **one transaction**
- `refundedAt` stamped *before* revoking access, because the revocation reads that flag
- metadata trusted for `userId`/`productId` because the app set it and Polar returns it unchanged
- the frozen `productDetails` copy, so a receipt survives the product being renamed
- `pricePaidInCents` from what Polar actually collected, after any discount

Store `buyerCountry` from the order's billing address.

- [ ] **Step 5: Run the tests**

```bash
pnpm test src/app/api/webhooks/polar/route.test.ts
```

Expected: PASS.

- [ ] **Step 6: Delete the Stripe webhook**

```bash
git rm -r src/app/api/webhooks/stripe
```

- [ ] **Step 7: Build and test**

```bash
pnpm build && pnpm test
```

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat: handle Polar webhooks, replacing the Stripe route"
```

---

### Task 7: Receipts, purchase history and refunds

The one part of this migration that is a rewrite rather than a rename.
`receiptDetails.ts` performs deep Stripe expansion, reads a hosted receipt URL
off the charge, computes partial-refund amounts, and fetches coupons by ID to
name discount rows. None of that translates.

The good news is that Polar's order is richer, so this gets simpler: an order
carries `subtotal`, `discount`, `tax`, `net` and `total` directly, and discounts
appear as line items in that breakdown — no expansion, no second call to name a
coupon.

**Files:**
- Modify: `src/app/features/purchases/lib/receiptDetails.ts`
- Create: `src/app/features/purchases/lib/receiptDetails.test.ts`
- Modify: `src/app/features/purchases/actions/purchases.ts`
- Modify: `src/app/(consumer)/purchases/[purchaseId]/page.tsx`
- Modify: `src/app/admin/purchases/[purchaseId]/page.tsx`
- Modify: `src/app/features/purchases/db/adminPurchases.ts`

**Interfaces:**
- Consumes: `polar`, `PurchaseTable.polarOrderId`
- Produces: `getReceiptDetails({ polarOrderId, pricePaidInCents, isRefunded }): Promise<{ receiptUrl?: string; pricingRows: PricingRow[] }>` — same return shape, so neither page changes structurally
- `PricingRow` is unchanged: `{ label: string; amountInDollars: number; isBold?: boolean }`

- [ ] **Step 1: Read the orders and refunds surface**

```bash
grep -rn "orders\|refunds" node_modules/@polar-sh/sdk/docs/sdks/ | head -30
```

Confirm the method names for get-order, get-order-receipt and create-refund, and
the exact field names on the order's amount breakdown.

- [ ] **Step 2: Write the failing test**

Create `src/app/features/purchases/lib/receiptDetails.test.ts`:

```ts
import { beforeEach, describe, expect, it, vi } from "vitest";

const get = vi.fn();
const receipt = vi.fn();

vi.mock("@/lib/polar", () => ({
    polar: { orders: { get, receipt } },
}));

const { getReceiptDetails } = await import("./receiptDetails");

beforeEach(() => {
    get.mockReset();
    receipt.mockReset();
});

describe("getReceiptDetails", () => {
    // Showing "Subtotal" and "Total" as identical lines on an undiscounted
    // purchase is noise, so a plain sale gets exactly one row.
    it("returns a single total row when nothing changed the price", async () => {
        get.mockResolvedValue({
            subtotalAmount: 6000,
            discountAmount: 0,
            totalAmount: 6000,
        });
        receipt.mockResolvedValue({ url: "https://polar.sh/receipt.pdf" });

        const { pricingRows, receiptUrl } = await getReceiptDetails({
            polarOrderId: "ord_1",
            pricePaidInCents: 6000,
            isRefunded: false,
        });

        expect(pricingRows).toEqual([
            { label: "Total", amountInDollars: 60, isBold: true },
        ]);
        expect(receiptUrl).toBe("https://polar.sh/receipt.pdf");
    });

    it("breaks the price down when a discount applied", async () => {
        get.mockResolvedValue({
            subtotalAmount: 6000,
            discountAmount: 2700,
            totalAmount: 3300,
        });
        receipt.mockResolvedValue({ url: "https://polar.sh/receipt.pdf" });

        const { pricingRows } = await getReceiptDetails({
            polarOrderId: "ord_2",
            pricePaidInCents: 3300,
            isRefunded: false,
        });

        expect(pricingRows.at(0)).toEqual({ label: "Subtotal", amountInDollars: 60 });
        expect(pricingRows.at(-1)).toEqual({ label: "Total", amountInDollars: 33, isBold: true });
    });

    // The receipt PDF is rendered on demand: the first request can answer 202
    // while it is still being produced. A receipt page must not block on that —
    // the local data is the substance of the page.
    it("still renders when the receipt PDF is not ready yet", async () => {
        get.mockResolvedValue({
            subtotalAmount: 6000,
            discountAmount: 0,
            totalAmount: 6000,
        });
        receipt.mockRejectedValue(Object.assign(new Error("accepted"), { statusCode: 202 }));

        const { pricingRows, receiptUrl } = await getReceiptDetails({
            polarOrderId: "ord_3",
            pricePaidInCents: 6000,
            isRefunded: false,
        });

        expect(receiptUrl).toBeUndefined();
        expect(pricingRows).toHaveLength(1);
    });

    // Polar unreachable, or an order too old to retrieve. The local receipt is
    // the point of those pages, so they still render in full — just without the
    // hosted link and the breakdown, neither of which we hold ourselves.
    it("falls back to local figures when Polar is unreachable", async () => {
        get.mockRejectedValue(new Error("network"));

        const { pricingRows, receiptUrl } = await getReceiptDetails({
            polarOrderId: "ord_4",
            pricePaidInCents: 6000,
            isRefunded: true,
        });

        expect(receiptUrl).toBeUndefined();
        expect(pricingRows.at(-1)).toEqual({ label: "Total", amountInDollars: 0, isBold: true });
    });
});
```

- [ ] **Step 3: Run it and watch it fail**

```bash
pnpm test src/app/features/purchases/lib/receiptDetails.test.ts
```

Expected: FAIL — `getReceiptDetails` still takes `stripeSessionId`.

- [ ] **Step 4: Rewrite `receiptDetails.ts`**

Keep `getPricingRows` exactly as it is — that arithmetic is provider-agnostic and
it is what keeps the buyer's page and the admin's page agreeing.

Replace everything above it:

- take `polarOrderId` instead of `stripeSessionId`
- one `polar.orders.get` call for the amounts; no expansion needed
- one `polar.orders.receipt` call for the hosted PDF, wrapped so a 202 or any
  failure simply omits `receiptUrl`
- delete `getLatestCharge`, `getDiscountRows` and `resolveCoupon` — Polar's order
  carries the discount amount directly, so there is no coupon to fetch and name
- keep the outer `try/catch` fallback verbatim in spirit: the page renders from
  local data when Polar cannot be reached

Label the discount row `"Descuento"` when the order gives no discount name.

- [ ] **Step 5: Run the tests**

```bash
pnpm test src/app/features/purchases/lib/receiptDetails.test.ts
```

Expected: PASS.

- [ ] **Step 6: Repoint both receipt pages**

In `src/app/(consumer)/purchases/[purchaseId]/page.tsx` and
`src/app/admin/purchases/[purchaseId]/page.tsx`, change the `getReceiptDetails`
argument from `purchase.stripeSessionId` to `purchase.polarOrderId`, and change
the column selected in each page's query (and in `adminPurchases.ts`) to match.

`polarOrderId` is nullable, so guard: a purchase with no order ID renders from
local figures alone rather than throwing.

- [ ] **Step 7: Move the refund action to Polar**

`refundPurchase` in `src/app/features/purchases/actions/purchases.ts` calls
Stripe directly. Replace that call with Polar's create-refund, keyed on
`polarOrderId`.

**Preserve the ordering and its comment.** Three systems have to agree — the
provider, the purchases table, the access table — and the current order is the
only one that fails safely: a refunded customer briefly keeping access is
recoverable, the reverse is not. The webhook doing the same work afterwards is
the safety net, not a duplicate.

- [ ] **Step 8: Build and test**

```bash
pnpm build && pnpm test
```

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "feat: move receipts, purchase history and refunds to Polar"
```

---

### Task 8: Remove Stripe entirely

**Files:**
- Delete: `src/lib/stripe.ts`, `src/drizzle/backfillPppCoupons.mjs`
- Modify: `src/app/features/countryGroups/lib/pppCoupons.ts`, `getUserCoupon.ts`
- Modify: `src/data/env/server.ts`, `src/test/setup.ts`, `package.json`

- [ ] **Step 1: Find every remaining reference**

```bash
grep -rn -i "stripe" src/ --include='*.ts' --include='*.tsx' --include='*.mjs' | grep -v 'drizzle/migrations'
```

- [ ] **Step 2: Strip the Stripe coupon provisioning**

In `pppCoupons.ts`, delete `ensurePppCoupon` and its Stripe import. Keep `toPercentOff` — it is arithmetic, not Stripe. In `getUserCoupon.ts`, rename the `stripeCouponId` check to `polarDiscountId`; the guard stays, because a group with a discount but no provider-side discount object must still fail closed to the full price.

- [ ] **Step 3: Delete the files**

```bash
git rm src/lib/stripe.ts src/drizzle/backfillPppCoupons.mjs
```

Remove the `db:backfill-coupons` script from `package.json`.

- [ ] **Step 4: Remove the env variables**

Delete `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_ALL_ACCESS_MONTHLY_PRICE_ID` and `STRIPE_ALL_ACCESS_YEARLY_PRICE_ID` from `src/data/env/server.ts` and from `src/test/setup.ts`.

- [ ] **Step 5: Uninstall the package**

```bash
pnpm remove stripe
```

- [ ] **Step 6: Prove it is gone**

```bash
grep -rn -i "stripe" src/ --include='*.ts' --include='*.tsx' --include='*.mjs' | grep -v 'drizzle/migrations'
```

Expected: no output. Migration files legitimately keep the old names — they are history.

- [ ] **Step 7: Build and test**

```bash
pnpm build && pnpm test
```

- [ ] **Step 8: Update the deploy workflow's build env**

`.github/workflows/deploy-hetzner.yml` writes four `STRIPE_*` placeholders. Replace them with Polar equivalents, or the Hetzner build fails at env validation:

```
POLAR_ACCESS_TOKEN=polar_at_placeholder
POLAR_WEBHOOK_SECRET=polar_whs_placeholder
POLAR_SERVER=production
POLAR_ALL_ACCESS_MONTHLY_PRODUCT_ID=00000000-0000-0000-0000-000000000001
POLAR_ALL_ACCESS_YEARLY_PRODUCT_ID=00000000-0000-0000-0000-000000000002
```

Also update the credential list in `deploy/README.md`.

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "feat: remove Stripe"
```

---

### Task 9: End-to-end verification

Nothing here is code. This is the gate before merging.

- [ ] **Step 1: Full check**

```bash
pnpm build && pnpm test && pnpm lint
```

- [ ] **Step 2: Add the five keys to `NALU_APP_ENV`**

Regenerate the secret file from `.env`, keeping the twelve existing lines, adding the five `POLAR_*` and removing the four `STRIPE_*`. Paste into the GitHub secret.

- [ ] **Step 3: Deploy**

Push the branch, merge to `main`, watch the Actions run go green.

- [ ] **Step 4: Re-save the course product**

In the admin panel, open "Los Elementales del Reino Escondido" and save it unchanged. The app creates it in Polar and stores `polarProductId`. Confirm it appears in the Polar dashboard.

- [ ] **Step 5: Create a 100% discount code**

In the Polar dashboard. **Never test with a real card** — processors read that as card testing and it can block the card or the account.

- [ ] **Step 6: Run the acceptance list from the spec**

1. No Stripe import anywhere.
2. Creating a product in admin creates it in Polar; editing updates it.
3. Checkout with the 100% discount produces a purchase row *and* course access, in one transaction.
4. Replaying the same webhook delivery changes nothing.
5. A refund revokes access.
6. Subscribing grants all-access; cancelling revokes at period end.
7. `/subscription-management` reaches Polar's portal.

- [ ] **Step 7: Confirm the buyer country landed**

```sql
SELECT "buyerCountry", "pricePaidInCents" FROM purchases;
```

Expected: `PA` for a test purchase from Panama. If it is `DE`, the `customerIpAddress` forwarding in Task 4 is not working — Polar is geolocating the Hetzner server.
