"use client";

import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useState,
    type ReactNode,
} from "react";
import { Menu, X } from "lucide-react";
import { BackLink } from "./BackToHomeLink";

// How a row inside the menu tells the menu it has been used. The menu is server
// -rendered markup handed to this component as a prop, so the two cannot talk
// through props — a context is what reaches across that gap, and React allows
// exactly this: a client provider, server-rendered children, client consumers
// below them.
//
// The default is a function that does nothing, so the nav can be rendered
// outside a frame — in a test, or on its own — without special-casing it.
const SideMenuContext = createContext<{ onNavigate: () => void }>({
    onNavigate: () => {},
});

export function useSideMenu() {
    return useContext(SideMenuContext);
}

// Tailwind's `lg`, the width at which the menu stops covering the page and
// starts sitting beside it. Written out because the decision to close on
// navigation is made in JavaScript, where a class name cannot be consulted.
const WIDE_SCREEN = "(min-width: 64rem)";

// A page whose contents are chosen from a panel down the left: the button that
// opens it, the panel itself, and whatever was chosen.
//
// Shared by /clases-gratuitas, where the panel lists a free course's classes, and
// /announcements, where it lists notices. Everything about how the panel behaves
// lives here; what goes inside it is the caller's business.
//
// The menu arrives as a prop rather than as `children` so that it can be wrapped
// in its own <Suspense> by the layout. That keeps the two independent — the page
// you asked for is not held up by the query that fills the panel, and the frame
// itself (background, columns, the button) is drawn before either arrives.
//
// It belongs in a layout, which is what makes the menu survive navigation: a
// layout is not re-rendered when you move between its own pages, so `open` and
// the panel's scroll position stay exactly as they were.
export function SideMenuFrame({
    menu,
    menuLabel,
    backHref = "/",
    backLabel = "Volver al salón",
    children,
}: {
    menu: ReactNode;
    // What the button says, and therefore what the panel is called: "Clases" on
    // /clases-gratuitas, "Anuncios" on /announcements. There is no default — a button
    // labelled for the wrong page is worse than a compile error.
    menuLabel: string;
    backHref?: string;
    backLabel?: string;
    children: ReactNode;
}) {
    // Shut on arrival, at every width. The menu is a way of moving around, and
    // someone who has just opened a page has not asked to move yet — so what
    // they came for gets the whole width until they do.
    const [isOpen, setIsOpen] = useState(false);

    const close = useCallback(() => setIsOpen(false), []);

    // On a phone the menu covers the page, so picking something has to reveal
    // it. On a wide screen the menu sits in its own column alongside and costs
    // nothing to leave open — closing it there would only mean re-opening it to
    // reach the next thing.
    const onNavigate = useCallback(() => {
        if (window.matchMedia(WIDE_SCREEN).matches) return;
        close();
    }, [close]);

    // A new object every render would re-render every consumer every time.
    const menuContext = useMemo(() => ({ onNavigate }), [onNavigate]);

    // Escape closes it, the way it closes every other overlay. Bound only while
    // the menu is open, so nothing is listening the rest of the time.
    useEffect(() => {
        if (!isOpen) return;

        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === "Escape") close();
        };

        window.addEventListener("keydown", onKeyDown);
        return () => window.removeEventListener("keydown", onKeyDown);
    }, [isOpen, close]);

    return (
        <div className="mx-auto w-full max-w-7xl px-4 pt-32 pb-16">
            {/* This row has to sit in a specific slot in the stack, between two
                things:

                ABOVE the menu (z-40) and its backdrop (z-30), which on a phone
                are drawn over the page. Otherwise the button would be behind the
                panel it opens — the X hidden underneath it, leaving the dimmed
                strip down the side as the only way out.

                BELOW the site navbar, which is `fixed z-50`. At z-50 this row
                tied with it and won, because page content comes after the navbar
                in the document and a tie is broken by document order — so
                scrolling dragged the back link and the button up through the bar
                and left them floating over the logo. 45 keeps them under it.

                Any value in 41..49 does the job; the two neighbours are what the
                number means, not the number itself. */}
            {/* One row holding the two ends: the way out in the left corner, the
                way into the menu in the right one. `justify-between` at every
                width, so neither moves as the screen changes.

                The button opens a panel on the *left*, away from itself, which is
                deliberate: it puts the list where there is room for it beside the
                text rather than under the thumb that opened it. */}
            <div className="relative z-45 mb-8 flex items-center justify-between gap-4">
                <BackLink href={backHref}>{backLabel}</BackLink>

                <button
                    type="button"
                    onClick={() => setIsOpen(open => !open)}
                    // `aria-expanded` rather than only a change of icon: the
                    // icon says "open" or "close" to anyone looking at it, and
                    // this says the same thing to anyone who is not.
                    aria-expanded={isOpen}
                    aria-controls="side-menu"
                    className="flex shrink-0 cursor-pointer items-center gap-2 rounded-xl border border-gold/40 bg-[#0a1628]/70 px-4 py-2 text-base tracking-widest text-ink uppercase backdrop-blur-md transition-colors hover:border-gold/70 hover:text-ink-bright"
                >
                    {isOpen ? (
                        <X aria-hidden className="size-4 text-gold" />
                    ) : (
                        <Menu aria-hidden className="size-4 text-gold" />
                    )}
                    {menuLabel}
                </button>
            </div>

            {/* The grid gains its second column only while the menu is open, so
                on a wide screen the section is pushed aside rather than covered.
                On a phone there is no room to push anything: the menu is
                positioned over the page instead (see the <aside> below), and
                this stays a single column throughout. */}
            <div
                className={`lg:grid lg:items-start lg:gap-8 ${
                    isOpen ? "lg:grid-cols-[300px_minmax(0,1fr)]" : ""
                }`}
            >
                {/* Phone only, and only while open: a dark sheet over the
                    section, so the menu reads as being in front of the page
                    rather than part of it. Pressing it is the other way out,
                    which is what people try before finding the X. */}
                {isOpen && (
                    <button
                        type="button"
                        onClick={close}
                        aria-label={`Cerrar el menú de ${menuLabel.toLowerCase()}`}
                        className="fixed inset-0 z-30 bg-[#050b16]/70 backdrop-blur-sm lg:hidden"
                    />
                )}

                <aside
                    id="side-menu"
                    // Shut, this is not merely invisible — it is removed from
                    // the page: `inert` takes its links out of the tab order and
                    // hides them from screen readers. Without it the menu would
                    // be a stack of links waiting off the left edge that a
                    // keyboard could still walk into.
                    inert={!isOpen}
                    className={`
                        max-lg:fixed max-lg:inset-y-0 max-lg:left-0 max-lg:z-40 max-lg:w-[85%] max-lg:max-w-xs
                        max-lg:overflow-y-auto max-lg:border-r max-lg:border-gold/40 max-lg:bg-[#0a1628]/95
                        max-lg:p-4 max-lg:pt-48 max-lg:backdrop-blur-md
                        max-lg:transition-transform max-lg:duration-300 max-lg:ease-out
                        ${isOpen ? "max-lg:translate-x-0" : "max-lg:-translate-x-full"}
                        ${
                            isOpen
                                ? "lg:sticky lg:top-32 lg:block lg:self-start lg:rounded-2xl lg:border lg:border-gold/40 lg:bg-[#0a1628]/70 lg:p-4 lg:backdrop-blur-md"
                                : "lg:hidden"
                        }
                    `}
                >
                    <SideMenuContext.Provider value={menuContext}>
                        {menu}
                    </SideMenuContext.Provider>
                </aside>

                <div className="min-w-0">{children}</div>
            </div>
        </div>
    );
}
