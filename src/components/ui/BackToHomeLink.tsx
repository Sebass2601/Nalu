import Link from "next/link"
import { ArrowLeftIcon } from "lucide-react"
import type { ReactNode } from "react"
import { cinzel } from "./fonts"

// The way back out of a page: an arrow and a line of text naming where it goes.
//
// `text-ink`, not a hand-picked shade: the scale in globals.css reserves that
// step for emphasis that is not a heading, which is what a way out is. Hover
// lifts it the last step to `ink-bright`.
//
// The arrow travels a few pixels left on hover — the same gesture the navbar
// plaques make upward, which is the site's way of saying a thing is pressable.
//
// It says where it goes rather than "Volver": the same arrow appears on pages
// reached from several directions, and a back link whose destination you cannot
// read before pressing it is a guess. That is also why this is a <Link> to a
// fixed place rather than `router.back()` — history is empty on a page opened
// from a shared link or a new tab, and an arrow that sometimes does nothing is
// worse than one that always goes somewhere sensible.
//
// Positioning is the caller's, because the two uses want different things: the
// auth screens pin it to the corner of an otherwise empty background, while the
// catalogue pages sit it at the top of their content column, in the flow, above
// the first thing on the page.
export function BackLink({
    href,
    className = "",
    children,
}: {
    href: string
    className?: string
    children: ReactNode
}) {
    return (
        <Link
            href={href}
            className={`${cinzel.className} group inline-flex items-center gap-3 text-base tracking-widest text-ink transition-colors hover:text-ink-bright sm:text-lg ${className}`}
        >
            <ArrowLeftIcon
                aria-hidden
                // Grows with the text either side of it, and thickens a little:
                // lucide's default 2px stroke reads as spindly next to Cinzel
                // once the glyphs are 18px.
                strokeWidth={2.25}
                // Gold, so it does not inherit the link's white. The words say
                // where you are going and the arrow says it is a way out —
                // different jobs, and the colour split is what separates them.
                // `group-hover` rather than `hover`, because the whole link is
                // the target and the arrow has to brighten with the text.
                className="size-5 text-gold transition-[color,transform] duration-200 ease-out group-hover:-translate-x-1 group-hover:text-gold-bright sm:size-6"
            />
            {children}
        </Link>
    )
}

// The way out of the auth screens.
//
// /login and /sign-up are the two pages in the app that render outside the
// consumer layout, so they carry no navbar and not even the logo is clickable
// — a visitor who opened one by accident, or who was bounced here by the proxy,
// has nothing to press but the browser's back button. This is that door.
//
// It leads to the castle rather than to `/`, alongside the two catalogue pages'
// own ways out: someone breaking off from signing in wants the room with the
// courses in it, not the entrance hall they already walked through.
//
// Written once and placed on both pages rather than in an `(auth)/layout.tsx`:
// both already paint their own full-screen background, and a layout would only
// wrap them to add one absolutely positioned link.
export function BackToCastleLink() {
    return (
        <BackLink
            href="/fetch-courses"
            className="absolute top-6 left-6 sm:top-8 sm:left-8"
        >
            Volver al castillo
        </BackLink>
    )
}
