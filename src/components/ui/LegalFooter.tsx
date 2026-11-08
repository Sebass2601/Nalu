import { Suspense } from "react";
import Link from "next/link";
import { CookieSettingsLink } from "@/components/analytics/Analytics";

// The quiet way to the terms, at the foot of every public page.
//
// Absolutely positioned against the wrapper the layouts put round each page,
// not placed in the flow after it. Two kinds of page share these layouts: the
// salon and the castle are exactly one screen tall and do not scroll — their
// artwork is `h-dvh` and swallows touch for panning — so anything placed after
// them would sit below the fold where no one could reach it. Pinned to the
// bottom of the wrapper, the link lands on the bottom edge of the artwork on
// those, and at the end of the content on every page that scrolls, inside the
// `pb-16` all of them close with.
//
// Deliberately faint: it is there for whoever goes looking for it, not to
// compete with the plaques. White at 45% rather than an `ink-*` token, because
// those already carry their own transparency and a further step down would
// compound into something unreadable. The full white on hover and focus is
// what confirms it is a link.
//
// `z-30` puts it over the artwork and the phone's swipe hint (which keeps its
// own text 40px clear of the bottom edge), and under the contact mark and the
// navbar. The wrapper itself is deaf to the pointer, so only the words take a
// tap — the strip either side of them stays part of the page beneath.
//
// "Cookies" joins it only for visitors who were shown the cookie notice, and
// reopens that notice. Whether that is this visitor depends on their country,
// read per request — hence its own <Suspense>, so the terms link is part of
// the static page and never waits on it.
export function LegalFooter() {
    return (
        <footer className="pointer-events-none absolute inset-x-0 bottom-0 z-30 flex items-center justify-center pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
            <Link href="/terminos" className={FOOTER_LINK_CLASS}>
                Términos y Condiciones
            </Link>
            <Suspense fallback={null}>
                <CookieSettingsLink className={`${FOOTER_LINK_CLASS} before:mr-3 before:-ml-1 before:text-white/30 before:content-['·']`} />
            </Suspense>
        </footer>
    );
}

const FOOTER_LINK_CLASS =
    "pointer-events-auto rounded px-2 py-1 font-sans text-xs tracking-wide text-white/45 transition-colors duration-200 hover:text-white focus-visible:text-white focus-visible:ring-2 focus-visible:ring-gold/60 focus-visible:outline-none";
