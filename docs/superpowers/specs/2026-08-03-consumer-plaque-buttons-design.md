# Consumer plaque buttons: one gold plaque for every consumer call to action

Date: 2026-08-03

## Problem

The consumer side has two unrelated button languages on screen at once.

The category doorways on the home page and the navbar items are plaques: a
bevelled octagon cut from `plaque.tsx`, edged with a gold rule and a fainter
one inside it, filled with frosted glass, set in Cinzel, pinned by a diamond top
and bottom. That shape is the site's identity — `plaque.tsx` exists precisely so
a doorway and a navbar item read as parts of the same building.

Every other control is a rounded rectangle with a 60%-opacity gold border that
fills solid on hover. It appears twenty-two times across fifteen files, mostly
as a copy-pasted class string:

```
rounded-lg border border-yellow-200/60 px-6 py-2 text-sm tracking-widest
text-yellow-200 uppercase transition-colors hover:bg-yellow-200
hover:text-[#0a1628]
```

Two consequences. Visually, a buyer moves from a plaque-lined home page to a
product page whose "Comprar ahora" belongs to a different design. Practically,
the padding and text size drift between copies — `px-6 py-2`, `px-8 py-4`,
`px-5 py-2`, `px-4 py-2`, `text-sm`, `text-lg`, `text-xs` — because there is
nowhere for the definition to live. `productCtaStyles.ts` was an attempt to fix
this for one page, and it covers four of the twenty-two.

## Goals

1. Every consumer call to action wears the category plaque.
2. One component owns the shape, so padding and type size cannot drift again.
3. The existing primary/secondary hierarchy survives the change.

Non-goals: any change to `/admin`, to `CategoryButton` or `NavItem` themselves,
to what any button does, or to the shadcn `Button` used everywhere else.

## Design

### The component

`src/components/ui/PlaqueButton.tsx`, built the way `NavItem` already is:
geometry from `bevelFace` / `bevelOutline` / `Diamond`, and a `<Link>` when
given `href`, a `<button>` when not.

That last part is load-bearing rather than convenience. Three consumer controls
are `<button type="submit">` inside a `<form action={serverAction}>` —
`CheckoutButton`, the billing-portal button, and the subscribe button — and each
one is a deliberate no-client-JavaScript checkout path. A link-only component
would force those to become client components to keep the look, which would
undo the reason they are forms.

```
href?      Link when present, button when absent
variant?   "primary" (default) | "secondary"
size?      "default" | "sm"
className? merged onto the outer element
```

Everything else passes through, so `type="submit"`, `disabled` and `onClick`
reach the underlying element untouched.

`className` landing on the outer element is what lets a caller say `w-full`
where a card wants a full-width button; the glass face inside is a block, so it
stretches with it.

### Geometry

|  | `default` | `sm` |
| --- | --- | --- |
| corner cut | 10px | 8px |
| padding | `px-8 py-3.5` | `px-5 py-2` |
| text | `text-base` | `text-sm` |
| tracking | `0.2em` | `0.18em` |
| diamonds | yes | no |

The cut follows the precedent the codebase already set: 12px on a doorway, 8px
on a navbar item, because the slice has to read as the same 45 degrees on a
shorter element. A default button sits between the two, so 10px.

Diamonds are dropped at `sm` because they straddle the top and bottom edges and
need vertical clearance to do so. At the sizes `sm` is used — the lesson
footer's ← Anterior / Siguiente → pair, a "Ver curso" at the foot of a card —
they would collide with the text above and below.

### Variants

|  | `primary` | `secondary` |
| --- | --- | --- |
| gold rule | `bg-yellow-200`, white on hover | `bg-yellow-200/40`, `/70` on hover |
| inner hairline | yes, 40% opacity | none |
| light sweep | yes | none |
| label | `text-yellow-200` → white | `text-yellow-200/70` → `text-yellow-200` |

Both keep the glass face (`bg-[#0a1628]/70 backdrop-blur-md`, `/85` on hover),
Cinzel, uppercase, the gold text-shadow glow, and the `-translate-y-0.5` hover
lift.

`secondary` reproduces the hierarchy already on the page: today's secondary
buttons use a 30%-opacity border against the primary's 60%, and drop the
label to 70-80% opacity. Dropping the hairline and the sweep as well is what
keeps the difference legible once both are wearing the same silhouette — with
identical rules, the only thing separating them would be an opacity step most
people would not consciously register.

### What is deliberately not carried over

`CategoryButton.twoLines()`, which splits a label across two lines at its most
balanced word boundary. It exists because a doorway is a fixed-size tile on
artwork that must always be two lines tall. Applied to a button it would render
"Comprar ahora" stacked, and "Gestionar suscripción" too. Labels stay on one
line.

### Call sites

**`primary`, `default` size — eight.** `CheckoutButton` ("Comprar ahora"),
`ProductCallToAction` ("Ir al curso"), the desktop "Empezar"/"Continuar" on the
course page, "Suscribirme" in the locked-lesson panel, "Ver mis cursos" on the
success page, "Gestionar suscripción", the subscribe page's "Suscribirme", and
the retry on the purchase-failure page.

**`primary`, `sm` size — eleven.** "Ver curso" in three places (product syllabus
card, `ProductCard`, `MyCourseCard`), the empty-state links on `/courses` and
`/purchases` (two each), the receipt link on a purchase, `PurchaseRow`'s main
action, the locked-lesson panel's secondary link, and the lesson footer's
← Anterior / Siguiente → pair, which is one component rendered twice.

**`secondary` — two.** "Volver" on the purchase-failure page, and
`PurchaseRow`'s second action.

`productCtaStyles.ts` is deleted; its two exports become `<PlaqueButton>` and
`<PlaqueButton size="sm">`, and its three importers move over.

### ActionButton

The lesson's "Marcar como completada" is an `ActionButton` — a client component
wrapping shadcn's `Button` with a pending state and an optional confirm dialog —
and it is shared with five admin call sites.

It gets an opt-in `plaque?: boolean`. When set, it renders `PlaqueButton`
instead of `Button`; unset, nothing about it changes. Only the lesson page
passes it. This keeps every admin button exactly as it is, which is the
requirement, without a second copy of the pending-state logic.

`PlaqueButton` therefore has to accept `disabled` and `onClick` and render
arbitrary children, since `ActionButton` wraps its label in `LoadingTextSwap`.

### Left alone

**The phone "next lesson" card** on the course page. On a phone, "Empezar" is
not a button: it is a `<span>` inside a `<Link>` that wraps the whole card —
lesson name, type icon, section name. A `PlaqueButton` cannot go inside it
without nesting an anchor in an anchor. It stays a card that ends in a pill.

**Four inline text links**, all underlined sentences sitting inside paragraphs
rather than controls: "Ver también los cursos disponibles para compra
individual" on `/subscribe`, "Ver cursos" on `/subscription`, "¿Tienes un código
de descuento?" in `CheckoutButton`, and each row's "Ver todos" in
`SubscriptionCourseRows`. "Ver todos" is worth naming explicitly because its
placement above a card row makes it look like a button in a screenshot; in the
markup it is `text-xs … underline`, the same species as the other three.

**The navbar, the category buttons, and all of `/admin`.**

### Skeletons

Two loading placeholders are shaped like the buttons they stand in for —
`ProductCallToActionSkeleton` (`h-14 w-48 rounded-lg`) and `StartButtonSkeleton`
(`h-15 w-48 rounded-lg`). Both get the bevelled clip path so the shape does not
change when the real control arrives.

## Verification

`npx tsc --noEmit` clean, then a look at each of the six affected pages:
product, course, lesson, purchases, purchase detail, subscribe/subscription —
at phone and desktop width, checking that full-width buttons still stretch, that
the lesson footer pair does not crowd, and that primary still outranks secondary
on the purchase-failure page where both appear together.
