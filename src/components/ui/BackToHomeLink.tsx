import Link from "next/link"
import { ArrowLeftIcon } from "lucide-react"
import { cinzel } from "./fonts"

// The way out of the auth screens.
//
// /login and /sign-up are the two pages in the app that render outside the
// consumer layout, so they carry no navbar and not even the logo is clickable
// — a visitor who opened one by accident, or who was bounced here by the proxy,
// has nothing to press but the browser's back button. This is that door.
//
// Written once and placed on both pages rather than in an `(auth)/layout.tsx`:
// both already paint their own full-screen background, and a layout would only
// wrap them to add one absolutely positioned link.
//
// The arrow travels a few pixels left on hover — the same gesture the navbar
// plaques make upward, which is the site's way of saying a thing is pressable.
export function BackToHomeLink() {
    return (
        <Link
            href="/"
            // `text-gold`, not a hand-picked yellow: the scale in globals.css
            // reserves that step for emphasis that is not a heading, which is
            // exactly what a single link on an otherwise empty background is.
            // Hover lifts it the last step to `gold-bright`.
            className={`${cinzel.className} group absolute top-6 left-6 inline-flex items-center gap-3 text-base tracking-widest text-gold transition-colors hover:text-gold-bright sm:top-8 sm:left-8 sm:text-lg`}
        >
            <ArrowLeftIcon
                aria-hidden
                // Grows with the text either side of it, and thickens a little:
                // lucide's default 2px stroke reads as spindly next to Cinzel
                // once the glyphs are 18px.
                strokeWidth={2.25}
                className="size-5 transition-transform duration-200 ease-out group-hover:-translate-x-1 sm:size-6"
            />
            Volver a la página principal
        </Link>
    )
}
