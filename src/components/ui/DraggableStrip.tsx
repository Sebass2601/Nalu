"use client";

import {
    ChevronDown,
    ChevronLeft,
    ChevronRight,
    ChevronUp,
} from "lucide-react";
import {
    useCallback,
    useLayoutEffect,
    useRef,
    useState,
    type ReactNode,
} from "react";
import {
    pageDistance,
    snapToCardGrid,
    wrapOntoMiddleCopy,
} from "./stripGeometry";

// How far the pointer must travel before we call it a drag rather than a click.
// Below this, a shaky hand on a card still opens the course.
const DRAG_THRESHOLD_PX = 5;

// Touch momentum keeps firing scroll events after the finger is gone. We wait
// for the strip to go quiet before repositioning it, because moving the scroll
// offset mid-animation kills the animation.
const SCROLL_IDLE_MS = 120;

// What a vertical strip is allowed to grow to, unless the caller says otherwise.
//
// A column of cards cannot simply be as tall as its contents: it would become
// the page, and the page already scrolls. Capping it makes the strip a window
// with the page running past it above and below — which is also what keeps the
// footer reachable, since a finger that runs out of strip at either end hands
// the scroll back to the page.
//
// `max-h` rather than `h`: a category holding two products should shrink to
// those two, not sit in a fixed box with dead space under them.
//
// Why this is a default and not a fixed rule: 70vh is measured from wherever
// the strip happens to start, and that differs by page. On the catalogue pages
// a back link and the category nav sit above it, which pushes the box down far
// enough that its bottom edge falls past the fold — the last card on screen is
// clipped by the screen, and no cut is visible at rest. A page without that
// chrome starts its box higher, so the same 70vh ends it short of the fold and
// puts a visible cut with an empty band under it. Such a page passes
// `maxHeightClassName` to add back what it is missing. See "Mis cursos".
const VERTICAL_MAX_HEIGHT = "max-h-[70vh]";

type Orientation = "horizontal" | "vertical";

// Everything about the strip that has a direction, in one place.
//
// The strip runs sideways as a row of cards and downwards as a column of them,
// and the difference between those two is entirely which member of a pair of
// DOM properties gets read: `scrollLeft` or `scrollTop`, `clientWidth` or
// `clientHeight`, `clientX` or `clientY`. Naming the pairs once here is what
// lets everything below — the measuring, the paging, the loop arithmetic, the
// drag — be written once instead of twice.
//
// The alternative was a second component for the vertical case. That would have
// meant two copies of the three-copy loop trick, which is the delicate part of
// this file and the last thing that should exist twice.
type Axis = {
    scroll(element: HTMLElement): number;
    setScroll(element: HTMLElement, offset: number): void;
    glideTo(element: HTMLElement, offset: number): void;
    // The strip's own length: how much of it you can see at once.
    viewport(element: HTMLElement): number;
    // The whole scrollable length, clones included.
    extent(element: HTMLElement): number;
    // An element's length along the axis.
    size(element: HTMLElement): number;
    // Where an element starts, measured from its offset parent.
    offset(element: HTMLElement): number;
    // The leading edge of a measured rectangle — the top of a column, the left
    // of a row.
    leadingEdge(rect: DOMRect): number;
    pointer(event: { clientX: number; clientY: number }): number;
    stripClassName: string;
    copyClassName: string;
};

const AXES: Record<Orientation, Axis> = {
    horizontal: {
        scroll: element => element.scrollLeft,
        setScroll: (element, offset) => {
            element.scrollLeft = offset;
        },
        glideTo: (element, offset) =>
            element.scrollTo({ left: offset, behavior: "smooth" }),
        viewport: element => element.clientWidth,
        extent: element => element.scrollWidth,
        size: element => element.offsetWidth,
        offset: element => element.offsetLeft,
        leadingEdge: rect => rect.left,
        pointer: event => event.clientX,
        stripClassName: "flex snap-x overflow-x-auto px-1 pb-2",
        copyClassName: "flex",
    },
    vertical: {
        scroll: element => element.scrollTop,
        setScroll: (element, offset) => {
            element.scrollTop = offset;
        },
        glideTo: (element, offset) =>
            element.scrollTo({ top: offset, behavior: "smooth" }),
        viewport: element => element.clientHeight,
        extent: element => element.scrollHeight,
        size: element => element.offsetHeight,
        offset: element => element.offsetTop,
        leadingEdge: rect => rect.top,
        pointer: event => event.clientY,
        stripClassName: "flex flex-col snap-y overflow-y-auto px-1 py-1",
        copyClassName: "flex flex-col",
    },
};

// A strip of anything — course cards, category plaques — dragged with a mouse
// and swiped with a finger.
//
// `orientation` decides whether it is a row read left to right or a column read
// top to bottom. Horizontal is the default because it is the older case and the
// one most callers still want; the column exists for phones, where a row of
// cards asks someone to swipe sideways through a page they are already scrolling
// downwards.
//
// A vertical strip is capped at VERTICAL_MAX_HEIGHT — see that constant for why
// it cannot simply be as tall as its cards, and why `maxHeightClassName` exists
// for the pages that need a different cap. Both are ignored by a horizontal
// strip, which is bounded by the width of whatever it sits in.
//
// With `loop` it runs endlessly in both directions; without it the strip has a
// first item and a last one, and stops at each. Looping suits a sampler that is
// a window onto a longer list, which is what the subscription rows are. It suits
// a complete, countable set far less: reaching the end of the categories and
// finding the first one again reads as a bug, and takes away the "that is all of
// them" that hitting the end is there to say.
//
// The loop is three copies of the same cards laid end to end, with the real one
// in the middle. You always start on the middle copy, and whenever you scroll
// off either end of it we move the scroll offset by exactly one copy-length —
// putting you back on the middle copy at the same visual position. Nothing moves
// on screen; only the number changes. That is the whole trick.
//
//   [clone][real][clone]        period = distance from one copy to the next
//         ^~~~~~^              valid resting range: [period, 2 * period)
//
// Three details are load-bearing:
//   - The clones are `aria-hidden`, and their links are taken out of the tab
//     order, so screen readers and Tab see one copy of each course, not three.
//     They stay clickable on purpose — at rest, part of what is on screen is
//     usually a clone.
//   - Cloning only happens when one copy is already longer than the strip. With
//     fewer items than fit on screen there is nothing to loop, and repeating
//     them would just look like a bug.
//   - Snapping is switched off mid-drag. With `snap-mandatory` on, the strip
//     fights the pointer and lands on a card boundary every frame.
//
// The strip is named by whichever of `headingId` and `label` the caller has: a
// strip that already draws its own heading points at it, and one that does not
// — the category plaques — names itself instead.
//
// `gapClassName` is the one piece of the caller's layout the strip has to know,
// because the clones are its own elements and have to be spaced exactly like the
// copy between them, or the loop would step by the wrong distance.
//
// `loop` is opt-in rather than the default: a strip that simply ends is the
// ordinary case, and the endless one is the special effect.
//
// `rewindOn` sends the strip back to its start whenever the value handed to it
// changes — the id of the open category, for the row of category plaques, so
// that every choice made from it returns it to the beginning.
//
// `mouseDrag` is what a mouse may do to the strip. Turned off, the arrows become
// the only way to move it on a desktop — a strip of large cards is a shelf to be
// paged through rather than shoved, and grabbing one to slide the strip is easy
// to do by accident when what you meant was to open the course under the
// pointer. It has no bearing on touch: a finger scrolls the strip natively, this
// component never intercepts that, and taking swiping away from a phone would
// leave the strip with no way to move at all.
export function DraggableStrip({
    headingId,
    label,
    previousLabel,
    nextLabel,
    orientation = "horizontal",
    maxHeightClassName = VERTICAL_MAX_HEIGHT,
    loop = false,
    rewindOn,
    mouseDrag = true,
    gapClassName = "gap-4",
    className = "",
    children,
}: {
    headingId?: string;
    label?: string;
    previousLabel: string;
    nextLabel: string;
    orientation?: Orientation;
    maxHeightClassName?: string;
    loop?: boolean;
    rewindOn?: string;
    mouseDrag?: boolean;
    gapClassName?: string;
    className?: string;
    children: ReactNode;
}) {
    const axis = AXES[orientation];

    const stripRef = useRef<HTMLDivElement>(null);
    // First and second copy. Their offsets give us the period without having
    // to know anything about gaps or padding.
    const firstCopyRef = useRef<HTMLDivElement>(null);
    const realCopyRef = useRef<HTMLDivElement>(null);
    // The third copy, held only so its links can be taken out of the tab order
    // alongside the first one's. See the effect that does it.
    const lastCopyRef = useRef<HTMLDivElement>(null);

    // Off until measurement proves the items overflow the strip. It is what
    // decides whether the arrows are worth drawing at all — there is nowhere to
    // page to when everything already fits.
    const [overflows, setOverflows] = useState(false);

    // Clones exist only when there is both something to loop and a caller
    // asking for a loop. Everywhere else the strip is the single real copy,
    // which is what gives it a first item and a last one.
    const looping = overflows && loop;

    const periodRef = useRef(0);
    // Distance from one card's leading edge to the next one's. Every scroll the
    // arrows perform is a whole multiple of this, so the strip can only ever
    // come to rest on a card boundary — never on a sliver of one.
    const cardStepRef = useRef(0);
    // The scroll offset at which a card sits flush against the strip's leading
    // edge. Not zero — the strip has padding — and guessing it wrong leaves
    // scroll-snap a few pixels to correct after every arrow press.
    const alignOriginRef = useRef(0);
    const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Pointer position and scroll offset at press time, plus whether we have
    // passed the threshold. A ref, not state: this changes every pointermove and
    // no pixel of it belongs in a render.
    const drag = useRef<{
        pointerId: number;
        startPointer: number;
        startScroll: number;
        moved: boolean;
    } | null>(null);

    // Measure on mount and on every resize: whether to loop at all, how long a
    // copy is, and — the first time clones appear — park the strip on the middle
    // copy. Layout effect, so the parking happens before the browser paints.
    useLayoutEffect(() => {
        const strip = stripRef.current;
        const realCopy = realCopyRef.current;
        if (!strip || !realCopy) return;

        const measure = () => {
            const doesOverflow = axis.size(realCopy) > axis.viewport(strip);
            setOverflows(doesOverflow);

            const firstCard = realCopy.children[0] as HTMLElement | undefined;
            const secondCard = realCopy.children[1] as HTMLElement | undefined;
            cardStepRef.current = firstCard
                ? (secondCard
                      ? axis.offset(secondCard) - axis.offset(firstCard)
                      : axis.size(firstCard))
                : 0;
            alignOriginRef.current = firstCard
                ? axis.leadingEdge(firstCard.getBoundingClientRect())
                  - axis.leadingEdge(strip.getBoundingClientRect())
                  + axis.scroll(strip)
                : 0;

            // No clones — either nothing overflows, or this strip does not
            // loop — means no period, which is what every piece of loop
            // arithmetic below checks before doing anything.
            const firstCopy = firstCopyRef.current;
            if (!doesOverflow || !firstCopy) {
                periodRef.current = 0;
                return;
            }

            const period = axis.offset(realCopy) - axis.offset(firstCopy);
            const isFirstMeasurement = periodRef.current === 0;
            periodRef.current = period;

            // Park on the middle copy, on the nearest card boundary, so
            // scroll-snap has nothing to correct the moment anyone touches it.
            if (isFirstMeasurement) {
                axis.setScroll(
                    strip,
                    snapToCardGrid(
                        period,
                        alignOriginRef.current,
                        cardStepRef.current
                    )
                );
            }
        };

        measure();
        const observer = new ResizeObserver(measure);
        observer.observe(strip);
        observer.observe(realCopy);
        return () => observer.disconnect();
        // `looping` is read back through the refs it creates, so the effect has
        // to run again once the clones exist to measure the period.
    }, [looping, axis]);

    // Take the clones' links out of the tab order, without taking them out of
    // reach of the pointer.
    //
    // The clones used to carry `inert`, which does both — and the second half
    // of that was a bug you could click on. The strip rests anywhere inside the
    // middle copy, and the viewport is shorter than a copy, so the cards
    // filling the far side of the screen are routinely the third copy's:
    // real-looking cards that swallowed every click, in a pattern that changed
    // each time the strip moved because a different copy had slid under the
    // pointer. Keeping only `aria-hidden` and `tabIndex = -1` hides the
    // duplicates from screen readers and from Tab exactly as before, while
    // leaving them clickable — and a clone is a copy of the same link, so
    // clicking one opens the course it appears to be.
    useLayoutEffect(() => {
        if (!looping) return;
        for (const clone of [firstCopyRef.current, lastCopyRef.current]) {
            clone?.querySelectorAll<HTMLElement>(
                "a, button, input, select, textarea, [tabindex]"
            ).forEach(element => {
                element.tabIndex = -1;
            });
        }
        // `children` because new cards arrive with their links tabbable.
    }, [looping, children]);

    // Back to the beginning whenever `rewindOn` changes.
    //
    // Only some navigations mount a new strip, which would start at the
    // beginning by itself; the ones that stay on the same route re-render this
    // one, and it holds whatever position it was left at. This is what makes
    // the two behave alike.
    //
    // A layout effect, so the strip is already at its start in the first frame
    // anyone sees — moving it after a paint would show the old position for an
    // instant and read as a glitch rather than as a reset.
    useLayoutEffect(() => {
        const strip = stripRef.current;
        if (!strip || rewindOn == null) return;
        axis.setScroll(strip, 0);
    }, [rewindOn, axis]);

    // Bring the scroll offset back onto the middle copy. Returns how much it
    // moved, because a drag in progress is holding a scroll position from
    // before the jump and has to be corrected by the same amount.
    const normalize = useCallback(() => {
        const strip = stripRef.current;
        if (!strip) return 0;

        const delta = wrapOntoMiddleCopy(axis.scroll(strip), periodRef.current);
        if (delta !== 0) axis.setScroll(strip, axis.scroll(strip) + delta);
        return delta;
    }, [axis]);

    // Any scroll we did not cause directly — touch swipes, momentum, the
    // keyboard, a smooth arrow animation — is repositioned once it settles.
    function onScroll() {
        if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
        idleTimerRef.current = setTimeout(() => {
            if (!drag.current?.moved) normalize();
        }, SCROLL_IDLE_MS);
    }

    // As many whole cards as fit, per press — see `pageDistance`.
    //
    // The pre-jump matters too: from the middle copy a full page could land
    // past the end of the third copy, which is a hard wall the smooth scroll
    // would slam into. Jumping a copy back (or forward) first guarantees the
    // destination is inside the scroll range, and it is invisible because every
    // copy is identical.
    function page(direction: 1 | -1) {
        const strip = stripRef.current;
        if (!strip) return;

        const cardStep = cardStepRef.current;
        const period = periodRef.current;
        const step = pageDistance(axis.viewport(strip), cardStep);

        if (period > 0) {
            normalize();
            const current = axis.scroll(strip);
            if (
                direction === 1
                && current + step > axis.extent(strip) - axis.viewport(strip)
            ) {
                axis.setScroll(strip, current - period);
            } else if (direction === -1 && current - step < 0) {
                axis.setScroll(strip, current + period);
            }
        }

        // Rounded onto the card grid rather than added to wherever we are: a
        // drag can leave the strip mid-card, and adding a whole page to a
        // half-card offset just carries that offset along forever.
        const raw = axis.scroll(strip) + direction * step;
        axis.glideTo(
            strip,
            snapToCardGrid(raw, alignOriginRef.current, cardStep)
        );
    }

    function onPointerDown(event: React.PointerEvent<HTMLDivElement>) {
        // Nothing below ever runs on a strip the mouse may not drag. It is the
        // only gate needed: no drag is ever started, so the move and release
        // handlers find no drag to continue, and the click suppression finds
        // none to suppress.
        if (!mouseDrag) return;

        // Touch and pen already scroll natively, and hijacking them breaks
        // scrolling through the page.
        if (event.pointerType !== "mouse" || event.button !== 0) return;
        const strip = stripRef.current;
        if (!strip) return;

        drag.current = {
            pointerId: event.pointerId,
            startPointer: axis.pointer(event),
            startScroll: axis.scroll(strip),
            moved: false,
        };
    }

    function onPointerMove(event: React.PointerEvent<HTMLDivElement>) {
        const state = drag.current;
        const strip = stripRef.current;
        if (!state || !strip || event.pointerId !== state.pointerId) return;

        const distance = axis.pointer(event) - state.startPointer;

        if (!state.moved) {
            if (Math.abs(distance) < DRAG_THRESHOLD_PX) return;
            state.moved = true;
            // Only now do we take the pointer, so a plain click on a card is
            // never stolen from the link underneath it.
            strip.setPointerCapture(state.pointerId);
            strip.style.scrollSnapType = "none";
            strip.style.cursor = "grabbing";
        }

        // Content moves with the pointer, so the scroll offset moves against it.
        axis.setScroll(strip, state.startScroll - distance);
        // Safe to do mid-drag: no animation is running to interrupt, so the
        // loop is seamless however far the pointer travels.
        state.startScroll += normalize();
    }

    function endDrag(event: React.PointerEvent<HTMLDivElement>) {
        const state = drag.current;
        const strip = stripRef.current;
        if (!state || !strip || event.pointerId !== state.pointerId) return;

        if (state.moved) {
            if (strip.hasPointerCapture(state.pointerId)) {
                strip.releasePointerCapture(state.pointerId);
            }
            strip.style.scrollSnapType = "";
            strip.style.cursor = "";
        }
        // Kept until the click event has fired so onClickCapture can read it;
        // the click always follows pointerup on the same tick.
        drag.current = { ...state, pointerId: -1 };
    }

    // A drag that ends on top of a card would otherwise open that course.
    function onClickCapture(event: React.MouseEvent<HTMLDivElement>) {
        if (drag.current?.moved) {
            event.preventDefault();
            event.stopPropagation();
        }
        drag.current = null;
    }

    return (
        <div className={`group relative ${className}`}>
            <div
                ref={stripRef}
                tabIndex={0}
                role="group"
                aria-labelledby={headingId}
                aria-label={headingId ? undefined : label}
                onScroll={onScroll}
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={endDrag}
                onPointerCancel={endDrag}
                onClickCapture={onClickCapture}
                // `overflow-anchor:none`: scroll anchoring is the browser
                // adjusting scroll on its own when content changes, which for
                // this strip is never wanted — its contents change exactly when
                // a navigation redraws the items, and the position is managed
                // here.
                // The grab cursor only where grabbing does something. Left on
                // a strip that cannot be dragged, it promises a movement that
                // never comes — and it is the one thing on screen telling
                // people to try.
                className={`snap-mandatory scrollbar-none [overflow-anchor:none] [&::-webkit-scrollbar]:hidden ${
                    axis.stripClassName
                } ${
                    // Only a column has a height to cap. Applied to a row it
                    // would shorten the cards rather than the strip.
                    orientation === "vertical" ? maxHeightClassName : ""
                } ${mouseDrag ? "cursor-grab" : ""} ${gapClassName}`}
            >
                {looping && (
                    <div
                        ref={firstCopyRef}
                        aria-hidden
                        className={`shrink-0 ${axis.copyClassName} ${gapClassName}`}
                    >
                        {children}
                    </div>
                )}
                <div
                    ref={realCopyRef}
                    className={`shrink-0 ${axis.copyClassName} ${gapClassName}`}
                >
                    {children}
                </div>
                {looping && (
                    <div
                        ref={lastCopyRef}
                        aria-hidden
                        className={`shrink-0 ${axis.copyClassName} ${gapClassName}`}
                    >
                        {children}
                    </div>
                )}
            </div>

            {/* On overflow rather than on looping: a strip that ends still has
                somewhere to page to, right up until it reaches that end. */}
            {overflows && (
                <>
                    <PageButton
                        direction={-1}
                        orientation={orientation}
                        label={previousLabel}
                        onClick={() => page(-1)}
                    />
                    <PageButton
                        direction={1}
                        orientation={orientation}
                        label={nextLabel}
                        onClick={() => page(1)}
                    />
                </>
            )}
        </div>
    );
}

// Sits over the strip's leading or trailing edge, on mouse-driven devices only
// — a finger has the whole strip to swipe and does not need a target
// overlapping the first card. On a phone, where the vertical strip lives, this
// never draws at all; it is here for a narrow desktop window.
//
// Hidden until the strip is hovered, but always shown once focused, or a
// keyboard would Tab to something invisible.
//
// Invisible is not absent: at `opacity-0` this was still a 3rem band down each
// edge of the strip, quietly eating presses meant for the cards beneath it.
// `pointer-events-none` is what makes hidden mean hidden, and it lifts in step
// with the opacity — by the time the button can take a click it can also be
// seen. The two states are driven by the same `group-hover`, so they cannot
// disagree.
function PageButton({
    direction,
    orientation,
    label,
    onClick,
}: {
    direction: 1 | -1;
    orientation: Orientation;
    label: string;
    onClick: () => void;
}) {
    const vertical = orientation === "vertical";
    const Chevron = vertical
        ? direction === 1
            ? ChevronDown
            : ChevronUp
        : direction === 1
          ? ChevronRight
          : ChevronLeft;

    // A band across the strip: down one side when it is a row, across one end
    // when it is a column. Rounded on the inner side only, so it reads as
    // sitting over the strip's edge rather than floating on top of it.
    const placement = vertical
        ? direction === 1
            ? "inset-x-0 bottom-0 h-12 rounded-t-2xl"
            : "inset-x-0 top-0 h-12 rounded-b-2xl"
        : direction === 1
          ? "top-0 bottom-2 right-0 w-12 rounded-l-2xl"
          : "top-0 bottom-2 left-0 w-12 rounded-r-2xl";

    return (
        <button
            type="button"
            onClick={onClick}
            aria-label={label}
            className={`absolute z-10 hidden items-center justify-center bg-[#0a1628]/80 text-gold opacity-0 backdrop-blur-sm transition-opacity pointer-events-none group-hover:pointer-events-auto group-hover:opacity-100 focus-visible:pointer-events-auto focus-visible:opacity-100 focus-visible:outline-2 focus-visible:outline-gold pointer-fine:flex ${placement}`}
        >
            <Chevron className="size-7" />
        </button>
    );
}
