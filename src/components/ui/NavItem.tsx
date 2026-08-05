"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import type { ReactNode } from "react"
import { cn } from "@/lib/utils"
import { bevelFace, bevelOutline, Diamond } from "./plaque"

// The same plaque as a category doorway, at the size a navbar can carry.
//
// 8px of corner rather than the doorway's 12: the cut has to read as the same
// 45-degree slice on an item a third the height, and 12 would eat the corners of
// a phone-sized tile outright.
const CUT = 8
const FACE = bevelFace(CUT)
const RULE = bevelOutline({ cut: CUT, inset: 0, width: 2 })
const HAIRLINE = bevelOutline({ cut: CUT, inset: 4, width: 1 })

// Where you are is the one thing a navbar knows that the page does not repeat,
// so the plaque is spent marking it rather than drawn around everything. "/" has
// to match exactly — every other route begins with it, and a prefix test would
// leave Inicio lit on every screen in the app.
function isCurrent(pathname: string, href: string) {
    if (href === "/") return pathname === "/"
    return pathname === href || pathname.startsWith(`${href}/`)
}

// One doorway in a navbar: an icon, a label beside it on anything wider than a
// phone, and the plaque that closes around it.
//
// At rest it is only the icon and its label. Hovering fills the glass and draws
// the gold rule; being the current section does the same and keeps it, adding
// the inner hairline and the two diamonds — the full plaque, so the section you
// are in is the one that looks built rather than merely lit.
//
// Renders a <button> when given no `href`, which is what lets the sign-out form
// carry the same plaque as the links either side of it without a second
// component that would have to be kept in step by hand.
export function NavItem({
    href,
    icon,
    label,
}: {
    href?: string
    icon: ReactNode
    label: string
}) {
    const pathname = usePathname()
    const current = href != null && isCurrent(pathname, href)

    const body = (
        <>
            {/* Frosted glass, tinted and blurred exactly like the bar it sits
                in — so it reads as a pane set into the bar rather than a shape
                floating over it. */}
            {/* The blur is switched with the tint, not left on underneath it.
                The bar is already blurring what is behind it, and a second
                blur over the same pixels leaves a visible rectangle even with
                nothing tinting it — every item would wear a faint box at rest. */}
            <span
                aria-hidden
                className={cn(
                    "pointer-events-none absolute inset-0 transition-colors duration-300",
                    current
                        ? "bg-[#0a1628]/85 backdrop-blur-md"
                        : "bg-transparent group-hover:bg-[#0a1628]/85 group-hover:backdrop-blur-md"
                )}
                style={{ clipPath: FACE }}
            />

            {/* Light sweep, the doorway's own hover gesture. Clipped to the
                face so it cannot slide out past the bevelled corners. */}
            <span
                aria-hidden
                className="pointer-events-none absolute inset-0 overflow-hidden"
                style={{ clipPath: FACE }}
            >
                <span className="absolute inset-y-0 -left-full w-1/2 -skew-x-12 bg-white/10 blur-md transition-transform duration-700 ease-out group-hover:translate-x-[400%]" />
            </span>

            {/* Gold rules on top, so the glass beneath stays see-through. */}
            <span
                aria-hidden
                className={cn(
                    "pointer-events-none absolute inset-0 bg-gold transition-opacity duration-200",
                    current ? "opacity-100" : "opacity-0 group-hover:opacity-70"
                )}
                style={{ clipPath: RULE }}
            />
            {current && (
                <span
                    aria-hidden
                    className="pointer-events-none absolute inset-0 bg-gold opacity-40"
                    style={{ clipPath: HAIRLINE }}
                />
            )}

            <span className="relative flex flex-col items-center justify-center">
                {icon}
                {/* The label is the first thing to go on a phone: six of these
                    have to share the width, and the icon already carries the
                    meaning at that size. */}
                <span className="mt-1 hidden text-xs tracking-widest sm:block">
                    {label}
                </span>
            </span>

            {/* Only on the current item, at every width now that the tile is
                tall enough to carry them.

                The bottom one lands on the bar's hairline rather than above it:
                the tile leaves 12px below it, a diamond overhangs 7 once
                rotated, and the hairline sits 5px up from the bottom rule, so
                the tip crosses it by about a pixel. Left alone deliberately —
                closing that gap would mean either a shorter tile or moving the
                hairline off the 5px inset it shares with every other plaque,
                and at this size the tip reads as pinned to the rule. */}
            {current && (
                <>
                    <Diamond className="top-0 -translate-y-1/2" />
                    <Diamond className="bottom-0 translate-y-1/2" />
                </>
            )}
        </>
    )

    const className = cn(
        // One height at every width. The bar is 80px whatever the screen, and a
        // phone was leaving nearly half of it empty — the tile now fills the
        // same 56px it does on a desktop, which is what makes the bar read as
        // built rather than as a thin strip with small marks in it.
        //
        // Only the horizontal padding gives way on a phone, where six of these
        // and the logo have to share 360px. That keeps the icon growing while
        // the tile stays the width it already was.
        "group relative inline-flex h-16 items-center justify-center px-1.5 select-none",
        "text-gold transition-[color,transform] duration-200 ease-out",
        // `hover:active:` so a phone tap changes nothing — a bare `active:`
        // translate made iOS Safari drop clip-path'd layers mid-press.
        // See the same line in PlaqueButton.
        "hover:-translate-y-0.5 hover:text-white hover:active:translate-y-0",
        "focus-visible:outline-none focus-visible:-translate-y-0.5",
        "sm:px-4",
        current && "text-gold-bright"
    )

    if (href == null) {
        return (
            <button type="submit" className={cn(className, "cursor-pointer")}>
                {body}
            </button>
        )
    }

    return (
        <Link
            href={href}
            aria-current={current ? "page" : undefined}
            className={className}
        >
            {body}
        </Link>
    )
}
