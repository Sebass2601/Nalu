# Replacing Stripe with Polar

Design agreed 2026-08-11. Branch: `feat/polar-migration`.

## Why

Nalu operates from Panama, which is not on Stripe's supported-country list, so a
Stripe merchant account is impossible and the sandbox integration can never go
live. Polar is a Merchant of Record: it is legally the seller, charges the
customer under its own registrations, handles VAT and sales tax worldwide, and
pays the balance out via Stripe Connect Express — which **does** reach Panama
(confirmed against Polar's supported-countries list).

Merchant-of-record status also settles the tax question on the customer side:
Nalu never registers for VAT anywhere. Income tax on the payouts remains a
Panamanian matter and is out of scope here.

## What makes this cheap

**There are no customers to protect.** Production holds 0 rows in `purchases`
and 0 in `subscriptions`. No live subscription can break, no receipt can be
orphaned, and no payment history needs migrating. That removes the entire class
of difficulty that normally dominates a payment-provider change.

So: a clean rip-and-replace, not a coexistence layer. No provider abstraction —
an interface with one real implementation is scaffolding maintained forever for
a switch that will never be flipped, and Stripe is not a viable fallback here.

## Environment: production, no sandbox

Polar's sandbox is a wholly separate account, organization, access token and
webhook endpoint. Nothing crosses over, so developing in sandbox means doing
every manual setup step twice and recreating every product at cutover.

Since the account review gates *payouts* rather than *transactions*
("new purchases keep going through" while under review), building directly
against production costs nothing and deletes a whole cutover phase.

Testing uses a **100% discount code**, which is Polar's own documented approach:
*"set up a free product or a 100% discount code so no real money changes
hands."* Never test with a real card — payment processors read that as card
testing and it can block the card or the account.

## Decisions taken

| Decision | Choice | Reason |
|---|---|---|
| Strategy | Rip-and-replace on a branch | Zero customers; coexistence buys nothing |
| SDK | `@polar-sh/sdk` | Polar's current guidance, over the `@polar-sh/nextjs` adapter |
| Environment | Production | Sandbox would duplicate all manual setup |
| Products | Auto-synced from admin panel | Ports the existing `stripeProducts.ts` behaviour |
| Subscription plans | Manual in dashboard, IDs in env | Matches the existing arrangement |
| PPP / regional pricing | Ported, left unwired | It has never worked in production; bundling it would make a checkout failure ambiguous |
| Polar benefits/entitlements | Not adopted | `user_course_access` is already the source of truth |
| Currency | USD only | Panama uses USD; Polar does not auto-convert, so each extra currency is a price to maintain by hand |

## Schema

One migration.

| Table | Today | Becomes |
|---|---|---|
| `products` | `stripeProductId`, `stripePriceId` | `polarProductId` |
| `purchases` | `stripeSessionId`, `stripePaymentIntentId` | `polarCheckoutId`, `polarOrderId` |
| `users` | `stripeCustomerId` | *dropped* |
| `subscriptions` | `stripeCustomerId`, `stripeSubscriptionId`, `stripePriceId` | `polarSubscriptionId`, `polarProductId` |
| `country_groups` | `stripeCouponId` | `polarDiscountId` (stays null) |
| `purchases` | — | **new** `buyerCountry` (ISO code, nullable) |

Two columns disappear:

- **Products lose one.** Stripe splits product and price into two objects with
  opposite mutability rules, which is most of what `stripeProducts.ts` exists to
  manage. Polar gives each product a single pricing model and lets the amount be
  edited in place, so a price change is an edit rather than a new object. The
  stored ID stays stable across price changes — meaning the env-held subscription
  product IDs survive repricing with no redeploy.
- **Users lose one.** Polar accepts `externalCustomerId`; passing the app's own
  user ID creates or finds the matching Polar customer automatically. Nothing
  needs storing locally.

Also keep the buyer's country on the purchase record. Polar records it for its
own VAT purposes and the app already detects it. Revenue split by buyer country
is what a Panamanian accountant will need, and reconstructing it later from bank
statements is miserable.

## Environment variables

Added — all five already present in `.env`, and all must be added to
`src/data/env/server.ts` and to the `NALU_APP_ENV` GitHub secret:

```
POLAR_ACCESS_TOKEN
POLAR_WEBHOOK_SECRET
POLAR_SERVER=production
POLAR_ALL_ACCESS_MONTHLY_PRODUCT_ID
POLAR_ALL_ACCESS_YEARLY_PRODUCT_ID
```

Removed: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`,
`STRIPE_ALL_ACCESS_MONTHLY_PRICE_ID`, `STRIPE_ALL_ACCESS_YEARLY_PRICE_ID`.
`NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` is already dead — nothing reads it.

The env schema validates on boot, so a missing key fails the build rather than
failing at checkout.

## Code

Client construction, per Polar's integration guide:

```ts
import { Polar } from "@polar-sh/sdk";

const polar = new Polar({
  accessToken: env.POLAR_ACCESS_TOKEN,
  server: env.POLAR_SERVER,
});
```

**Replaced wholesale**

| Today | Becomes |
|---|---|
| `src/lib/stripe.ts` | `src/lib/polar.ts` |
| `src/app/features/products/lib/stripeProducts.ts` | `polarProducts.ts` |
| `src/app/features/purchases/actions/stripe.ts` | `polar.ts` |
| `src/app/api/webhooks/stripe/route.ts` | `src/app/api/webhooks/polar/route.ts` |

New: `src/app/api/checkout/route.ts`.

**Rewritten:** subscription actions, `plans.ts`, the write paths in
`products.ts`, `users.ts`, the five schema files, the env schema.

**Rename-only (~30 files):** pages and components reading `stripeSessionId` and
friends. Mechanical.

**Deleted:** `src/drizzle/backfillPppCoupons.mjs` and the Stripe coupon
provisioning in `pppCoupons.ts`.

Route paths follow the project's own convention (`/api/webhooks/<provider>`),
not the differing paths in Polar's scaffold prompt and integration guide.

## Webhook handling

Event mapping:

| Stripe today | Polar |
|---|---|
| `checkout.session.completed` | `order.paid` |
| `charge.refunded` | `order.refunded` |
| `customer.subscription.*` | `subscription.created` / `active` / `updated` / `canceled` / `revoked` / `cycled` / `past_due` / `paused` / `resumed` / `uncanceled` |

The endpoint is registered at `https://naluescuela.com/api/webhooks/polar`,
format raw, subscribed to the Order, Subscription, Refund and Customer families.

The existing handler's structure is kept — it is the best part of the current
integration and none of it is Stripe-specific:

- purchase row and course access written in **one transaction**, so a receipt
  can never exist without the access it paid for
- idempotent, because retries and multiple entry points mean it genuinely runs
  more than once per payment
- a 500 asks for redelivery; a bad signature returns 4xx and is never retried
- refunds stamp `refundedAt` before revoking access, because the revocation
  reads that flag

Verification differs from Stripe and must be done Polar's way:

```ts
import { validateEvent, WebhookVerificationError } from "@polar-sh/sdk/webhooks";
```

- **Raw body only.** Re-serialised JSON invalidates the signature.
- Headers are Standard Webhooks: `webhook-id`, `webhook-timestamp`,
  `webhook-signature`.
- **Deduplicate on the `webhook-id` header**, not on the event or order ID.
- Respond 200 quickly; defer slow work.

## Gotchas that must be handled from the start

- **`customer_ip_address` must be forwarded** when creating checkout sessions.
  Sessions are created server-side, and Polar otherwise reads the *server's* IP —
  placing every buyer in Germany, where the Hetzner box lives. This is the same
  behind-a-proxy failure as the `0.0.0.0:3000` auth bug and the unverified
  Arcjet country detection; three instances of one pattern.
- **Never pass `organization_id`** in create calls. The organization access
  token is already scoped, and passing it returns 422.
- **`successUrl` carries a `{CHECKOUT_ID}` token**, which preserves the current
  behaviour of provisioning access on return so a buyer never lands on a page
  claiming they own nothing.
- **Product visibility** must be set explicitly in `polarProducts.ts`, not left
  to a default, so auto-created products match the subscription products.
- **The API 307-redirects to trailing-slash paths** — follow redirects.

## Deferred, deliberately

- **Embedded vs hosted checkout.** Embedded keeps buyers on the site, which
  suits the Salón's visual identity; but wallet methods (Apple Pay, Google Pay)
  are disabled in embedded mode until the domain is manually validated by Polar.
  Decide in the checkout phase.
- **Wiring PPP.** Needs the six regional discounts created in Polar, their IDs
  stored in `polarDiscountId`, application at checkout creation, and country
  detection behind Caddy confirmed working. No webhook changes required —
  discounts are applied on the outbound call, not received as events.
- **Whether Polar checkout offers PayPal to buyers.** Polar's docs list it;
  an open GitHub issue implies card-only. Observable during the discount test.

## Phases

| # | Work | Depends on |
|---|---|---|
| 0 | Schema migration + env schema | — |
| 1 | Polar client + `polarProducts.ts` | 0 |
| 2 | One-time purchase checkout | 1 |
| 3 | Subscriptions + portal link | 1 |
| 4 | Webhooks | 2, 3 |
| 5 | Delete Stripe; update tests and `src/test/setup.ts` | 4 |
| 6 | End-to-end verification with a 100% discount | 5 |

## Manual steps

**Done:** organization created; identity verified; payout account connected;
access token created and verified (HTTP 200); both subscription products created;
webhook endpoint registered with signing secret; all five keys in `.env`.

**Outstanding:**

- Rename `Sucripción` → `Suscripción` on both products (customer-facing).
- Support email at the domain — blocked on Angel, who holds the Squarespace
  account. Gates *submitting* for review only.
- Submit for review. Gates payouts only; sales work meanwhile.
- Add the five keys to the `NALU_APP_ENV` secret before the first deploy.
- Re-save the $60 course in the admin panel so the app creates it in Polar.
- Create a 100% discount code and run one test purchase.
- Delete the junk `papapapapa` and `pepepepe` courses that came across in the
  database migration.

## Acceptance

1. `pnpm build` and `pnpm test` pass with no Stripe import anywhere.
2. Creating a product in the admin panel creates it in Polar; editing updates it.
3. A checkout with a 100% discount completes and produces a purchase row plus
   course access, in one transaction.
4. Replaying the same webhook delivery changes nothing.
5. A refund revokes access.
6. Subscribing grants all-access; cancelling revokes at period end.
7. `/subscription-management` reaches Polar's portal.
