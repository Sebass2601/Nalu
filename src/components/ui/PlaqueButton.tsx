import Link from "next/link"
import type { ComponentProps, ReactNode } from "react"
import { Cinzel } from "next/font/google"
import { cn } from "@/lib/utils"
import { bevelFace, bevelOutline, Diamond } from "./plaque"

const cinzel = Cinzel({ subsets: ["latin"] })

// The category doorway's plaque, at the two sizes a call to action needs.
//
// The shape is the site's identity — `plaque.tsx` exists so that a doorway and
// a navbar item read as parts of the same building — and this is what lets the
// buttons join them instead of being rounded rectangles from another design.
//
// It renders a <Link> when given `href` and a <button> when not, the same split
// NavItem makes and for the same reason: three of the controls that wear this
// are <button type="submit"> inside a <form action={serverAction}>. Those are
// deliberately free of client JavaScript, and a link-only component would force
// them to become client components just to keep the look.

// 12px of corner on a doorway, 8 on a navbar item — the slice has to read as
// the same 45 degrees whatever the height. A default button sits between the
// two, and `sm` is short enough to want the navbar's.
// The rule is 0.5px rather than the doorway's 2. A doorway is a large plaque
// seen from across the page and needs the weight; at button size that reads as
// a heavy border rather than an edge.
//
// Sub-pixel is deliberate and behaves differently by display: on a 2x screen it
// is a true crisp hairline, on a 1x screen the browser cannot draw half a pixel
// and antialiases it to a full pixel at roughly half opacity — so it comes out
// fainter there rather than thinner. Both are the intended "barely there" edge.
const SHAPES = {
    default: {
        face: bevelFace(10),
        rule: bevelOutline({ cut: 10, inset: 0, width: 0.5 }),
        hairline: bevelOutline({ cut: 10, inset: 5, width: 1 }),
    },
    sm: {
        face: bevelFace(8),
        rule: bevelOutline({ cut: 8, inset: 0, width: 0.5 }),
        hairline: bevelOutline({ cut: 8, inset: 4, width: 1 }),
    },
} as const

type PlaqueSize = keyof typeof SHAPES
type PlaqueVariant = "primary" | "secondary"

type PlaqueOwnProps = {
    variant?: PlaqueVariant
    size?: PlaqueSize
    className?: string
    children: ReactNode
}

type PlaqueButtonProps = PlaqueOwnProps &
    (
        // Decorative only: the plaque's look on a <span>, for the case where
        // something outside it is already the link. A card that is one big tap
        // target cannot hold an anchor or a button inside it, so this is what
        // lets the pill at the bottom of such a card match a real button
        // instead of being a rounded rectangle imitating one.
        | { as: "span"; href?: undefined }
        | ({ as?: undefined; href: ComponentProps<typeof Link>["href"] } & Omit<
              ComponentProps<typeof Link>,
              "href" | "className" | "children"
          >)
        | ({ as?: undefined; href?: undefined } & Omit<
              ComponentProps<"button">,
              "className" | "children"
          >)
    )

export function PlaqueButton({
    as,
    href,
    variant = "primary",
    size = "default",
    className,
    children,
    ...props
}: PlaqueButtonProps) {
    const shape = SHAPES[size]
    const isPrimary = variant === "primary"

    const body = (
        <>
            {/* Primary is solid gold — the plaque cast rather than glazed.
                Secondary keeps the frosted glass the navbar and the doorways
                are made of, which is what makes it the quieter of the two. */}
            <span
                className={cn(
                    "relative block transition-colors duration-300",
                    isPrimary
                        ? "bg-yellow-200 group-hover/plaque:bg-yellow-100"
                        : "bg-[#0a1628]/70 backdrop-blur-md group-hover/plaque:bg-[#0a1628]/85",
                    size === "default" ? "px-8 py-3.5" : "px-5 py-2"
                )}
                style={{ clipPath: shape.face }}
            >
                {/* Light sweep on hover. Primary only — it is the loudest thing
                    the plaque does, and spending it on a secondary control is
                    what would flatten the hierarchy. Heavier than the glass
                    version, because white at 10% over gold is invisible. */}
                {isPrimary && (
                    <span
                        aria-hidden
                        className="absolute inset-y-0 -left-full w-1/2 -skew-x-12 bg-white/40 blur-md transition-transform duration-700 ease-out group-hover/plaque:translate-x-[400%]"
                    />
                )}
                <span
                    className={cn(
                        "relative block text-center whitespace-nowrap uppercase transition-colors duration-200",
                        size === "default"
                            ? "text-base tracking-[0.2em]"
                            : "text-sm tracking-[0.18em]",
                        isPrimary
                            ? "text-[#0a1628]"
                            : "text-yellow-200/70 group-hover/plaque:text-yellow-200"
                    )}
                >
                    {children}
                </span>
            </span>

            {/* The rules sit on top, so a secondary plaque's glass stays
                see-through underneath. On primary they change job: a gold rule
                on a gold face would be invisible, so the outer one drops a
                shade to cut the edge against the page and the inner hairline
                goes navy — the engraved line rather than the drawn one. */}
            <span
                aria-hidden
                className={cn(
                    "pointer-events-none absolute inset-0 transition-colors duration-200",
                    isPrimary
                        ? "bg-yellow-300 group-hover/plaque:bg-yellow-200"
                        : "bg-yellow-200/40 group-hover/plaque:bg-yellow-200/70"
                )}
                style={{ clipPath: shape.rule }}
            />
            {isPrimary && (
                <span
                    aria-hidden
                    className="pointer-events-none absolute inset-0 bg-[#0a1628] opacity-25"
                    style={{ clipPath: shape.hairline }}
                />
            )}

            {/* Ornaments overhang the face, so they need room above and below.
                Dropped at `sm`, where the plaque is short enough that they
                would collide with whatever sits either side of it. */}
            {size === "default" && (
                <>
                    <Diamond
                        tone={isPrimary ? "navy" : "gold"}
                        className="top-0 -translate-y-1/2"
                    />
                    <Diamond
                        tone={isPrimary ? "navy" : "gold"}
                        className="bottom-0 translate-y-1/2"
                    />
                </>
            )}
        </>
    )

    // A NAMED group. Several of the places this lands are already inside a
    // `group` — the syllabus <details>, the contents-panel rows — and an
    // unnamed one would light the plaque up whenever the container was
    // hovered, not the button.
    const shell = cn(
        cinzel.className,
        "group/plaque relative inline-block cursor-pointer select-none",
        "transition-transform duration-200 ease-out hover:-translate-y-0.5 active:translate-y-0",
        // A real focus ring, offset far enough to clear the diamonds. The
        // browser default is unusable here — it traces the element's box, and
        // clip-path has cut that box into an octagon — but removing it without
        // a replacement, which is what CategoryButton does, leaves a keyboard
        // user with no idea where they are.
        "focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-yellow-200",
        "disabled:pointer-events-none disabled:opacity-50",
        className
    )

    if (as === "span") {
        return <span className={shell}>{body}</span>
    }

    if (href != null) {
        return (
            <Link
                href={href}
                className={shell}
                {...(props as Omit<
                    ComponentProps<typeof Link>,
                    "href" | "className" | "children"
                >)}
            >
                {body}
            </Link>
        )
    }

    return (
        <button
            className={shell}
            {...(props as Omit<
                ComponentProps<"button">,
                "className" | "children"
            >)}
        >
            {body}
        </button>
    )
}
