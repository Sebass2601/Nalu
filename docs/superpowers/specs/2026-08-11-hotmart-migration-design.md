# Replacing Stripe with Hotmart

Design agreed 2026-08-11. Branch: `feat/hotmart-implementation`, cut from `main`.

Supersedes `2026-08-11-polar-migration-design.md` and its plan, both kept in this
repository as the record of a path evaluated and abandoned.

## Why not Polar

Polar was chosen because it is a merchant of record whose payouts reach Panama
via Stripe Connect Express. That reasoning was sound and the integration was two
tasks in. It failed on the thing no amount of integration work could fix: the
payout account has sat in a Stripe compliance pause since 2026-08-10, with the
reason undisclosed by design and only Polar support able to reveal it. Money can
go in and cannot come out.

Hotmart is the replacement. It is also a merchant of record, so the tax
reasoning from the Polar design carries over unchanged: Hotmart is legally the
seller, collects and remits VAT and sales tax worldwide, and Nalu never
registers for VAT anywhere. Income tax on the payouts remains a Panamanian
matter and is out of scope here.

**The payout question is not settled and must be settled first.** See Manual
steps. Hotmart pays out via Payoneer, a Wise *business* account, or a local bank
account in USD, EUR or GBP. Panama uses USD, so all three routes look plausible,
but two documented rules matter: the bank account's country must match the
registered account country, and a bank account can only be registered *after the
first sale and full account approval*. That is the same shape of trap that
caught Polar — approval that arrives after commitment. Confirm in writing with
Hotmart support before writing code.

## What makes Hotmart a different kind of integration

Stripe and Polar are payment APIs: the server says "create a product", "create a
checkout for $60", and they comply. Hotmart is a **marketplace**. Its dashboard
is the source of truth for catalogue and pricing, and its API is largely
read-only reporting.

The app therefore stops driving the provider and starts listening to it.

| | Stripe today | Hotmart |
|---|---|---|
| Create a product | `stripe.products.create()` from the admin panel | **No write API.** Created by hand in the dashboard, then a **~3-day human content review** |
| Start a checkout | `checkout.sessions.create()` → session URL | **No API.** A static link: `pay.hotmart.com/<hotlink>?off=…` |
| Attach custom data | `metadata: { userId, productId }` | **No metadata.** Only `sck`/`xcod`, UTM-style tracking strings |
| Webhook auth | HMAC signature over the body | `X-HOTMART-HOTTOK`, a **static shared token** |
| Buyer country | Needs the buyer's IP forwarded | Free — `purchase.checkout_country.iso` |
| Refunds | API | API, by transaction code |
| Cancel subscription | API | API, by `subscriber_code` |
| Sandbox | Full test mode | **Canned fictional responses for REST endpoints only** |

This is less code than the Polar design, not more. Three whole problems vanish:
the product sync has nothing to sync to, the buyer-IP forwarding gotcha is moot
because Hotmart hosts the checkout, and the `discountMode` branching goes away
because Hotmart's checkout page has its own coupon field.

Two costs are real and accepted. Fees rise from Polar's ~4% + 40¢ to **9.9% +
$0.50**, and every product passes a human content review against Hotmart's Terms
of Use.

## Environment: production, with a 100% coupon

Hotmart's sandbox is documented as an environment where "the endpoint return
data is all fictional", with fixed request values that select canned response
scenarios. It exercises REST calls — refund, cancel subscription, sales history,
product list — and nothing else. **A purchase cannot be made in it, and it does
not cover webhooks.**

So checkout and webhooks are verified against production, using a **100%
discount coupon**, exactly as the Polar design concluded. Never test with a real
card: payment processors read that as card testing and it can block the card or
the account.

A sandbox credential is still worth creating, because the REST wrapper can be
developed against it before any product exists.

**There is no "sandbox build".** The implementation is written once.
`HOTMART_SERVER` (`sandbox | production`) selects the REST base URL and the
credential pair, and nothing else in the codebase knows the sandbox exists —
the same shape `POLAR_SERVER` had in the superseded design. Phases 1–2 run with
it on `sandbox`; from phase 3 it is `production` and stays there.

## Testing under the review constraint

Every product faces a ~3-day human review before it can be bought, and a real
purchase is the only thing that proves this integration works. Those two facts
together set the schedule, so they are recorded here rather than discovered.

**The review blocks exactly one test.** Everything else is verifiable without an
approved product:

| What | How | Needs an approved product? |
|---|---|---|
| OAuth token, token cache, `hotmartFetch()` | Sandbox | No |
| `GET /products`, sales-history, refund, cancel-subscription | Sandbox | No |
| Webhook handler logic — `sck`/email resolution, product matching, the one-transaction write, dedupe, refund ordering | Unit tests over recorded payloads | No |
| Webhook auth and routing on the live endpoint | Hotmart's **"Send test"** button, which sends a real payload carrying the account's own hottok | No |
| Checkout URL construction | Unit tests — it is a pure function | No |
| `/purchase/success`, `/purchase/pending` | Hit the routes in dev | No |
| **One real purchase, end to end** | 100% coupon, production | **Yes** |

The handler logic is pure reasoning over a JSON body, which is where nearly all
the risk lives and where none of it needs Hotmart.

**Therefore: register and submit the product on day one, before writing code.**
The review clock then runs in parallel with phases 0–7 instead of becoming a
three-day wall at the end. Net blocking time is roughly zero.

Note that a sandbox pass proves the call succeeded, not that the integration is
correct — the data is fictional. Only phase 8 proves the thing works.

**`ACTIVE` does not mean publicly visible.** With marketplace listing and the
affiliate programme disabled, an approved product is buyable only by someone
holding the hotlink. So the real course can be registered, approved and tested
against without being exposed in Hotmart's store — there is no need for a
throwaway product.

Edits to an `ACTIVE` product appear to re-enter review: the product status
vocabulary includes `CHANGES_PENDING_ON_PRODUCT` alongside `IN_REVIEW` and
`NOT_APPROVED`. Inferred from the status list, not confirmed in the help centre.
Treat edits to a live product as non-instant, and do the experimenting while the
product is still `DRAFT`, where changes are free.

## Decisions taken

| Decision | Choice | Reason |
|---|---|---|
| Strategy | Rip-and-replace on a branch cut from `main` | 0 purchases and 0 subscriptions in production; nothing to migrate |
| Branch | Fresh from `main`, Polar branch abandoned unpushed | Polar's migration never shipped, so one clean `stripe*` → neutral migration beats two stacked renames |
| SDK | None — a hand-written `hotmartFetch()` | No official Node SDK exists |
| Column naming | Provider-neutral | Third provider in two weeks; the provider's name belongs in the code that talks to it, not smeared across 30 files |
| Catalogue | Codes pasted into the admin form, verified on save | No write API to sync against |
| Promotions | Hotmart **offers**, chosen per checkout link | What offers are for; reversible; keeps Hotmart's reporting accurate |
| Regional pricing | **Off** | Page and checkout must always agree; Hotmart owns this natively if ever wanted |
| Marketplace listing and affiliates | **Off** | One route in means one thing to debug, and every purchase then carries a reliable `sck`. Also what lets an approved product stay unlisted while being tested. A growth lever to switch on deliberately later |
| PPP machinery | **Deleted, not ported** | Never worked in production; Hotmart's problem now |
| Buyer identity | `sck` = user ID, `buyer.email` as fallback | The only custom channel Hotmart offers |
| Currency | USD only | Panama uses USD |
| Access provisioning | Webhook only, with a polling success page | One authoritative path instead of today's two |
| Subscriptions at launch | **Built, tested, and switched off** behind `SUBSCRIPTIONS_ENABLED` | Launch is one course. No Hotmart subscription product is created, so there is nothing for the review team to verify and nothing to misconfigure |

## Schema

One migration, `stripe*` → provider-neutral.

| Table | Today | Becomes |
|---|---|---|
| `purchases` | `stripeSessionId`, `stripePaymentIntentId` | **`orderId`** (notNull, unique) — Hotmart has one identifier, the transaction code |
| `purchases` | — | **new** `buyerCountry` (ISO, nullable) |
| `products` | `stripeProductId`, `stripePriceId` | **`externalProductId`**, **`checkoutCode`**, **`externalOfferCode`** |
| `products` | — | **new** `promoOfferCode`, `promoPriceInDollars`, `promoEndsAt` (all nullable) |
| `users` | `stripeCustomerId` | *dropped* |
| `subscriptions` | `stripeCustomerId`, `stripeSubscriptionId`, `stripePriceId` | **`externalSubscriptionId`** (`subscriber_code`), **`externalProductId`** |
| `subscriptions` | `status` enum (Stripe vocabulary) | Hotmart's vocabulary — see below |
| `country_groups`, `countries` | — | **both dropped** |
| — | — | **new** `processed_webhooks` |

**Products need three codes, not one.** Hotmart uses different identifiers for
different jobs, and conflating them is the easiest way to build something that
half works:

- `externalProductId` — the 7-digit ID. Arrives as `data.product.id` on every
  webhook, so it is the **primary key for matching a Hotmart sale to a Nalu
  product**. Mandatory.
- `checkoutCode` — the *hotlink*, from Products → HotLinks. A different code
  entirely, and the one the checkout URL is built from.
- `externalOfferCode` — which offer, i.e. which price.

A promo is **live** when `promoOfferCode` is set *and* `promoEndsAt` is either
null or still in the future. Live promos are what the product page renders and
what the checkout link points at; otherwise both use the base offer. Expiry is
evaluated at read time, so a promo lapses on its own without a scheduled job.

**Purchase identifiers collapse from two to one.** Stripe needed a session ID
and a payment intent ID because refunds arrive keyed by charge rather than
session. Hotmart has a single transaction code (`HP17715690036014`) that
identifies the sale everywhere, including on refunds.

**The subscription status enum is genuinely different** and must be rewritten,
not mapped optimistically: `ACTIVE`, `INACTIVE`, `DELAYED`,
`CANCELLED_BY_CUSTOMER`, `CANCELLED_BY_SELLER`, `CANCELLED_BY_ADMIN`, `STARTED`,
`OVERDUE`. Assuming overlap with Stripe's words would crash on the first
cancellation.

**No rows are lost.** `purchases` and `subscriptions` hold 0 rows in production,
so the dropped columns discard nothing. Users, products and courses survive
untouched. Dropping `country_groups` and `countries` discards the six regional
groups and their sandbox coupon IDs, which is the intent.

### The dedupe bug inherited from the Polar plan

The Polar plan's `alreadyProcessed()` inserted the dedupe row **first**, then ran
the handler. If the handler then failed and returned 500, the row was already
committed — so the provider's retry was treated as a duplicate and skipped, and
the buyer silently never received what they paid for.

The fix: write the dedupe row **inside the same transaction** as the purchase
row and the course-access grant, so a failure rolls all three back together.

This matters more with Hotmart than it did with Polar. Hotmart's webhook carries
no timestamp, so there is nothing to reject a stale request by; deduplication on
the event `id` is the only replay defence there is.

## Environment variables

Added — all must reach `.env`, `src/data/env/server.ts`, `src/test/setup.ts`
and the `NALU_APP_ENV` GitHub secret.

**Required at launch — six lines:**

```
HOTMART_SERVER                 # sandbox | production
HOTMART_CLIENT_ID
HOTMART_CLIENT_SECRET
HOTMART_BASIC_TOKEN
HOTMART_HOTTOK
SUBSCRIPTIONS_ENABLED=false
```

**Required only when `SUBSCRIPTIONS_ENABLED=true` — the other eight:**

```
HOTMART_ALL_ACCESS_MONTHLY_PRODUCT_ID
HOTMART_ALL_ACCESS_MONTHLY_CHECKOUT_CODE
HOTMART_ALL_ACCESS_MONTHLY_OFFER_CODE
HOTMART_ALL_ACCESS_MONTHLY_PRICE
HOTMART_ALL_ACCESS_YEARLY_PRODUCT_ID
HOTMART_ALL_ACCESS_YEARLY_CHECKOUT_CODE
HOTMART_ALL_ACCESS_YEARLY_OFFER_CODE
HOTMART_ALL_ACCESS_YEARLY_PRICE
```

The course product's three codes are **not** here — they live in the database,
entered through the admin panel, because courses are added over time and env
vars would mean a redeploy per course.

Removed: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`,
`STRIPE_ALL_ACCESS_MONTHLY_PRICE_ID`, `STRIPE_ALL_ACCESS_YEARLY_PRICE_ID`.
`NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` is already dead. No `POLAR_*` variable is
ever added.

The env schema validates on boot, so a missing key fails the build rather than
failing at checkout.

`*_PRICE` holds **whole dollars**, matching `ProductTable.priceInDollars`, which
is an `integer`. It is display copy only — Hotmart charges whatever its offer
says, and nothing in this codebase sends an amount.

`HOTMART_SERVER` defaults to `production`, so a missing value fails safe rather
than silently pointing live traffic at fictional data.

### Known drift: prices are mirrored and nothing can verify them

Hotmart lets an offer's price be **edited in place**, and buyers who already paid
are unaffected — much kinder than Stripe, whose immutable `Price` objects forced
the create-new-and-archive dance in `stripeProducts.ts`. The offer code also
survives repricing, so the code pasted into the admin never needs updating.

The cost is that **`GET /products` returns product metadata but not offer
prices.** Nothing on this side can check that `products.priceInDollars`, or a
`*_PRICE` env var, still matches what Hotmart actually charges. Change a price in
Hotmart and forget the admin panel, and the page advertises one number while
checkout collects another — silently, with no test able to catch it.

There is no technical fix available. The mitigation is procedural: repricing is a
two-step operation, Hotmart first and Nalu second, and it belongs in the manual
checklist rather than in someone's memory.

**`*_PRICE` is a regression, accepted for lack of an alternative.** `plans.ts`
today reads both subscription prices *from Stripe*, with a comment explaining
that duplicating the numbers locally would let the page advertise one figure
while checkout charged another. Hotmart exposes no endpoint returning an offer's
price, so the numbers must be mirrored by hand. The mitigation is that each
number lives in exactly one place and the manual checklist names re-checking
them whenever a plan is repriced.

## Subscriptions ship built, tested and switched off

Launch is a single course. The all-access plans are not being sold yet, so **no
Hotmart subscription product is created** — submitting one for review with
nothing behind it invites a rejection that attaches to the account, not just the
product.

But the integration is still written in full, because the expensive part of
turning subscriptions on later is not the Hotmart configuration — it is the
schema, the status mapping, the webhook handlers and the access derivation.
Those are built and unit-tested now, while the surrounding work is fresh.

### The switch

`SUBSCRIPTIONS_ENABLED` is a boolean, default `false`, validated in
`src/data/env/server.ts` with a **zod refinement**: when it is `true`, the eight
`HOTMART_ALL_ACCESS_*` variables become required.

A plain `.optional()` on those eight would have been simpler and worse. It
permits a half-configured state that boots happily and then fails at a
customer's checkout — the exact failure mode the env schema exists to prevent.
The refinement makes "off" an explicit, declared state, and makes turning it on
impossible without completing the configuration.

### What the flag gates

| Off (`false`) | Behaviour |
|---|---|
| `/subscribe`, `/subscribe/categories/[categoryId]` | `notFound()` |
| `/subscription`, `/subscription-management` | `notFound()` |
| `CourseUpgradeOffer`, `SubscriptionCourseCard`, subscription nav links | Not rendered |
| `plans.ts` | Never called |

### What stays live regardless

- The `subscriptions` table, its status enum, and `upsertSubscription`.
- The webhook's subscription handlers. They are left **unconditional** — with no
  subscription product in existence no such event can arrive, and gating them
  would mean touching the webhook again on the day the switch is flipped.
- `userHasCourseAccess` → `hasActiveSubscription`. **This needs no change at
  all.** With no subscription rows it simply returns false, which is already the
  correct answer. It is the cleanest part of the deferral.

### Turning it on later

Create the two Hotmart products, run them through review, collect their three
codes each, add the eight variables, set `SUBSCRIPTIONS_ENABLED=true`, redeploy.
No code changes. The boot-time refinement is what guarantees that.

## Migration numbering

`feat/admin-course-access` — the admin panel for granting course access by hand —
is branched from the same `main` commit and mints its own
`0018_crazy_klaw.sql` (adds `user_course_access.grantedBy` plus two indexes).
This migration and that one therefore claim the same number.

The contents do not conflict; they touch different columns. But the second
branch to merge must have its migration **regenerated**, not renamed — the
snapshot chain in `meta/` encodes the preceding schema state, so a renamed file
would carry a snapshot describing the wrong parent.

**Merge the admin-access work first.** It is small, self-contained, and it is
what unblocks the Hotmart product review (see Manual steps). This migration then
regenerates as `0019` on top of it.

## Code

Provider-specific logic is confined to five places.

| File | Job |
|---|---|
| `src/lib/hotmart.ts` | OAuth client-credentials token, cached until expiry, plus a typed `hotmartFetch()`. ~60 hand-written lines |
| `src/app/features/purchases/lib/checkoutLink.ts` | Builds the checkout URL. A pure function |
| `src/app/api/webhooks/hotmart/route.ts` | Receives events |
| `src/app/features/purchases/lib/receiptDetails.ts` | Sales-history and price-details reads |
| `src/app/features/subscriptions/*`, `purchases/actions/purchases.ts` | Cancel-subscription and refund calls |

**Replaced**

| Today | Becomes |
|---|---|
| `src/lib/stripe.ts` | `src/lib/hotmart.ts` |
| `src/app/features/purchases/actions/stripe.ts` | `hotmart.ts` |
| `src/app/api/webhooks/stripe/route.ts` | `src/app/api/webhooks/hotmart/route.ts` |

**New:** `checkoutLink.ts`, `src/app/(consumer)/purchase/success/page.tsx`,
`src/app/(consumer)/purchase/pending/page.tsx`, `src/drizzle/schema/processedWebhook.ts`.

**Deleted outright**, not ported:

- `src/app/features/products/lib/stripeProducts.ts` — no write API to port to
- `src/app/features/countryGroups/` — the whole feature
- `src/app/features/products/lib/ppp.ts`
- `src/drizzle/backfillPppCoupons.mjs`, and the `db:backfill-coupons` script
- `src/app/admin/country-groups/page.tsx`
- `src/drizzle/schema/countryGroup.ts`, `country.ts`

Deleting the country-group feature reaches about ten files, including
simplifications to `ProductPrice.tsx`, `CheckoutButton.tsx` and
`subscribe/page.tsx`.

## Checkout

`startCheckout` stops calling an API and starts building a URL:

```
https://pay.hotmart.com/<checkoutCode>
  ?off=<promo offer if live, else base offer>
  &email=<user.email>
  &name=<user.name>
  &sck=<user.id>
```

The security property the current action was built around gets **stronger**. Its
comment explains at length why the action accepts only a product ID and never a
bound price, since a Server Action's arguments travel in an editable request
body. With Hotmart there is no amount in the request at all — Hotmart owns the
price. The three guards remain: redirect to `/login` when signed out, redirect to
`/products` when already owned, throw when the product has no Hotmart codes.

`sck` carries **only the user ID**. Carrying user and product together would
require betting on an undocumented length limit for that parameter; the product
is recovered from `data.product.id` instead, which is needed for
marketplace and affiliate sales anyway.

### The return trip

Hotmart's thank-you page is configured **per offer in the dashboard**, not per
checkout, so it cannot carry the buyer's identity. Whether Hotmart appends
transaction parameters to an external thank-you URL is **not documented and not
verified**, so the design must not depend on it.

- Approved → `https://naluescuela.com/purchase/success`
- Awaiting payment → `https://naluescuela.com/purchase/pending`

`/purchase/success` is authenticated — the buyer reached checkout from a signed-in
session. It checks whether the webhook has landed: if so, it forwards to the
product success page; if not, it shows "Estamos confirmando tu pago" and polls
for roughly 30 seconds before falling back to "te avisaremos por correo".

The separate pending URL matters because PIX and boleto approve hours later.

If Hotmart does pass a transaction code, the page may use it as a fast path via
sales-history. It must remain correct without it.

**Consequence:** access is provisioned through exactly one path — the webhook.
Today's `GET` half of the webhook route, which provisions on the buyer's return,
is deleted rather than ported.

## Webhooks

Endpoint `https://naluescuela.com/api/webhooks/hotmart`, version 2.0.0, `POST`
only.

| Event | Action |
|---|---|
| `PURCHASE_APPROVED` | Provision: purchase row + course access + dedupe row, in **one transaction** |
| `PURCHASE_COMPLETE` | Same handler, idempotent. Fires when the refund window closes |
| `PURCHASE_REFUNDED`, `PURCHASE_CHARGEBACK` | Stamp `refundedAt`, then revoke access |
| `PURCHASE_CANCELED`, `PURCHASE_EXPIRED`, `PURCHASE_DELAYED`, `PURCHASE_BILLET_PRINTED`, `PURCHASE_PROTEST` | Log only — nothing was provisioned |
| `SWITCH_PLAN`, and purchase events carrying `subscription.status` | Mirror subscription state |

Resolution order:

- **User** — `purchase.origin.sck` → user ID; else `buyer.email` → users table.
- **Product** — always `data.product.id` → `products.externalProductId`.

The existing handler's structure is kept, because none of it is Stripe-specific
and it is the best part of the current integration: purchase row and course
access written in one transaction so a receipt can never exist without the access
it paid for; idempotent throughout; a 500 asks for redelivery while a bad token
returns 4xx and is never retried; `refundedAt` stamped *before* revoking access,
because the revocation reads that flag; the frozen `productDetails` copy so a
receipt survives a product being renamed; `pricePaidInCents` taken from what was
actually collected.

`buyerCountry` comes from `purchase.checkout_country.iso`.

### Authentication is weaker than Stripe's, and is compensated for

Stripe and Polar sign the request body: a forged event is impossible without the
secret and is bound to that exact payload. Hotmart sends a static
`X-HOTMART-HOTTOK` header — the same string every time, no signature, no
timestamp. Anyone who learns it can mint any event they like. Hotmart's own
documentation says as much: "In the wrong hands, this information allows people
to send inappropriate data to your framework, posing as Hotmart."

Three mitigations, all required:

1. Compare with `crypto.timingSafeEqual`, never `===`. A fixed secret compared
   on every request is precisely the case where a naive comparison leaks it.
2. Deduplicate on the event `id`. With no timestamp there is nothing else to
   reject a replayed request by.
3. **Re-verify before granting.** On `PURCHASE_APPROVED`, call sales-history for
   that transaction code and confirm the sale exists and is approved before
   provisioning. One extra call per purchase, and it makes a forged event
   worthless.

## Subscriptions, receipts, refunds

**Subscriptions — written now, switched off at launch.** Two Hotmart
subscription products, monthly and yearly, each with its own product ID, hotlink
and offer code in env. *Neither product is created for launch*, so those eight
variables stay unset and `SUBSCRIPTIONS_ENABLED=false` makes that legal — see
the dedicated section above.

The code is built and unit-tested regardless.
`subscriptions.externalSubscriptionId` holds `subscriber_code`. Cancellation is
a real API call — `POST` by subscriber code, with a flag controlling whether
Hotmart emails the buyer — so `/subscription-management` keeps a working cancel
button rather than redirecting to a hosted portal. Access remains derived live
from the subscriptions table, unchanged.

**Receipts.** Simpler than Stripe. `receiptDetails.ts` currently performs deep
Stripe expansion, walks to the latest charge for a hosted receipt URL, computes
partial-refund amounts and fetches coupons by ID to name discount rows. Hotmart's
sales-history and price-details endpoints return the breakdown directly, and
Hotmart issues the buyer's invoice itself as merchant of record. `getPricingRows`
stays untouched — that arithmetic is provider-agnostic and is what keeps the
buyer's page and the admin's page agreeing. `getLatestCharge`, `getDiscountRows`
and `resolveCoupon` are deleted. The outer fallback is kept in spirit: when
Hotmart cannot be reached, both pages still render from local data.

**Refunds.** `POST` by transaction code. Refundable only when the sale is
`Approved` or `Completed`, not in trial, and not paid via BACS or SEPA. The
existing ordering comment in `refundPurchase` stays valid word for word: provider
first, then purchases, then access, because a refunded customer briefly keeping
access is recoverable and the reverse is not. The webhook doing the same work
afterwards is the safety net, not a duplicate.

## Deferred, deliberately

**The embedded checkout widget.** Hotmart offers one, surfaced in the offer's
"Links del Precio" dialog: a script from `static.hotmart.com/checkout/widget.min.js`
that intercepts clicks on a `pay.hotmart.com` link and opens the checkout as an
overlay on our own page. Launch uses the plain link and a `redirect()` instead.

Three reasons, weightiest first:

1. **This codebase already tried embedded checkout and reverted it.** The comment
   heading `purchases/actions/stripe.ts` records why: the embedded mode rendered a
   full checkout page in an iframe whose content "outgrew the iframe on narrow
   screens and was cut off", and embedding "bought almost no customisation while
   costing a whole class of layout bug". The reasoning transfers — arguably harder,
   because a merchant-of-record checkout carries a currency selector, payment
   method list and legal text that cannot be restyled at all. Embedding buys our
   background around a Hotmart box, not a Nalu checkout.
2. **The thank-you redirect inside an overlay is undocumented.** The entire return
   flow depends on Hotmart redirecting to `/purchase/success`. In an iframe that
   most likely renders the polling page *inside the modal*. Unverified, and it sits
   on the moment immediately after a customer has paid.
3. **It weakens the already-owned check.** `startCheckout` re-checks ownership
   server-side at click time precisely because "a page-level check protects
   nothing". The widget bakes the URL into the HTML at render time, moving that
   check earlier and allowing a double purchase across two tabs. Access stays
   idempotent, but the second payment is real.

Not a blocker either way: this project sets **no CSP** — `next.config.ts` has no
headers configuration — so the script and frame sources the widget needs would
require no work.

Revisit after the hosted flow is proven in production, where it can be measured
against a working baseline rather than adopted on faith.

## Not verified — confirm during implementation

Recorded so they are checked rather than assumed:

- The OAuth token endpoint URL. Documented inside a rendered code widget that
  could not be extracted; read it from the App Authentication page directly.
- Whether Hotmart appends transaction parameters to an external thank-you URL.
  The success page is designed not to need them.
- Any length limit on `sck`. Only a user ID is carried, which keeps it short.
- The exact event names offered in the webhook registration UI. `SWITCH_PLAN` and
  `UPDATE_SUBSCRIPTION_CHARGE_DATE` are separately documented; subscription
  cancellation appears to arrive via purchase events carrying
  `subscription.status`.
- Whether `GET /products` returns the hotlink, which would remove one of the
  three fields pasted by hand.

## Manual steps

Ordered as a schedule, not a checklist. Steps 1–12 all happen on **day one**,
before any code, because the ~3-day product review is the long pole and it must
be running while phases 0–7 are built.

Launch is **one product**, the $60 course. The subscription plans are not
created — see *Subscriptions ship built, tested and switched off* for what
happens instead, and for the short list of steps that turn them on later.

**Gating — before any code is written**

1. **Get Hotmart support to confirm Panama in writing**, covering producer
   registration and a payout route. This is the question that killed Polar.

**Account and catalogue — day one**

2. Create the account with registration country **Panama**; complete document
   verification.
3. Create **one product** — the $60 course. The two all-access plans are *not*
   created; see *Subscriptions ship built, tested and switched off*. It requires:
   - a **main image**, mandatory: JPG/PNG/GIF, max 5 MB, preferably 600×600.
     Use the same image as the Nalu product, so the buyer does not see it change
     between the product page and checkout.
   - a description of **at least 200 characters** — existing descriptions may be
     shorter.
   - **access method: external members area.** Not Hotmart Club, not Hotmart
     Members Area. Nalu *is* the members area; choosing either alternative would
     put the lessons behind Hotmart's player and make the webhook-driven access
     model pointless.
   - currency **USD**, language and country of sale, payment type **one-time**,
     and a **refund deadline** of 7, 15, 21 or 30 days — which also sets when
     `PURCHASE_COMPLETE` fires.
   - **a student login for the reviewer.** Selecting the external members area
     opens a form asking for a *student* username and password, not an admin
     one. A human reviewer signs into naluescuela.com with them to confirm the
     course really exists there, so this is a hard requirement of approval —
     see step 4.

   Settle all of this while the product is still **`DRAFT`**, where changes are
   free, then **submit for review on day one** so the ~3-day clock runs during
   implementation. Budget for a rejection round.
4. **Create the reviewer's student account and give it the course.** Sign up
   normally at `/sign-up` with a dedicated address, then grant that account
   access to the course through the admin access panel from
   `feat/admin-course-access` — which is precisely why that branch merges first.
   Before submitting, sign in as that student yourself and confirm a lesson
   actually plays; an empty shelf is a rejection.
5. **Disable marketplace listing and the affiliate programme.** This is what
   keeps an approved product buyable only via its hotlink, so the real course can
   be tested against without appearing in Hotmart's store — and it guarantees
   every purchase carries a usable `sck`.
6. Collect the **three codes**: 7-digit product ID, hotlink code
   (Products → HotLinks), offer code.
7. Set the offer's external thank-you pages: approved →
   `https://naluescuela.com/purchase/success`, awaiting payment →
   `https://naluescuela.com/purchase/pending`.
8. Confirm **regional pricing is off**.
9. Create a **100% discount coupon** for testing.

**Credentials — day one**

10. Tools → Developer Credentials → create a **production** credential (leave the
    sandbox box unchecked) **and** a sandbox one, so phases 1–2 can proceed before
    any product is approved.
11. Tools → Webhook → register the endpoint, version 2.0.0, subscribed to the
    events above. Copy the **hottok** from the Authentication tab.
12. Add the **six** launch variables to `.env` **and** to the `NALU_APP_ENV`
    GitHub secret before the first deploy. The eight subscription variables are
    not set, and must not be — `SUBSCRIPTIONS_ENABLED=false` is what makes their
    absence legal.

**Housekeeping**

13. Merge `feat/admin-course-access` first, then regenerate this migration as
    `0019`. See *Migration numbering*.
14. Reset the local database. It has the abandoned Polar migration `0018`
    applied, and this branch is cut from `main`, which does not.
15. Paste the three codes into the course product in the Nalu admin and save.
16. Delete the junk `papapapapa` and `pepepepe` courses.
17. Decide what happens to the Polar organization, whose payout account is still
    frozen. Close it deliberately rather than leaving it.

**Standing procedure — repricing.** Because nothing can verify the two sides
agree, a price change is always two steps in this order: edit the offer in
Hotmart, then update `priceInDollars` in the Nalu admin (or the `*_PRICE` env var
for a subscription plan, which needs a redeploy). See *Known drift* above.

**No longer blocking:** the support email at the domain, which was waiting on
Angel and the Squarespace account. Hotmart documents that "the default account
email will be used if a personalized email has not been provided."

## Phases

| # | Work | Depends on |
|---|---|---|
| 0 | Schema migration (as `0019`), env schema incl. the `SUBSCRIPTIONS_ENABLED` refinement, local DB reset | `feat/admin-course-access` merged |
| 1 | `src/lib/hotmart.ts` — token cache + `hotmartFetch()` — *`HOTMART_SERVER=sandbox`* | 0 |
| 2 | Admin: three code fields, verified against `GET /products` on save — *sandbox* | 1 |
| 3 | `checkoutLink.ts`, `startCheckout`, `/purchase/success` and `/purchase/pending` | 2 |
| 4 | Webhook route, dedupe-in-transaction, sales-history verification | 3 |
| 5 | Subscriptions: checkout, cancel, status mirroring — **behind the flag, unit-tested only, no Hotmart products** | 4 |
| 6 | Receipts, purchase history, refunds | 4 |
| 7 | Delete Stripe, PPP and country groups; update the deploy workflow and `deploy/README.md` | 5, 6 |
| 8 | End-to-end verification with the 100% coupon — *`HOTMART_SERVER=production`* | 7, **and product `ACTIVE`** |

Phases 3–7 are written against production configuration but verified by unit
tests and Hotmart's "Send test"; only phase 8 needs an approved product.

## Acceptance

1. `pnpm build`, `pnpm test` and `pnpm lint` pass, with no Stripe or Polar
   import anywhere in `src/`.
2. Saving a product with its three Hotmart codes verifies them against
   `GET /products` and refuses codes that do not resolve.
3. With `SUBSCRIPTIONS_ENABLED=false` and the eight subscription variables
   **absent**, the app boots, `/subscribe`, `/subscription` and
   `/subscription-management` all 404, and no subscription UI renders anywhere.
   Setting it to `true` without those variables fails at boot rather than at
   checkout.
3. A checkout with the 100% coupon completes and produces a purchase row **and**
   course access, in one transaction.
4. Replaying the same webhook delivery changes nothing.
5. A request with a wrong or absent hottok is rejected with 4xx and never
   provisions.
6. A refund revokes access.
7. *Deferred until subscriptions are enabled:* subscribing grants all-access and
   cancelling revokes it. Verified by unit tests now; verifiable end to end only
   once the two Hotmart products exist.
8. `SELECT "buyerCountry" FROM purchases` reads `PA` for a Panamanian test
   purchase.
9. A promo offer set on a product sends the buyer to the promo price, and
   clearing it returns them to the base offer.
