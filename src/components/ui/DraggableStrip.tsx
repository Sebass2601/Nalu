"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import {
    useCallback,
    useLayoutEffect,
    useRef,
    useState,
    type ReactNode,
} from "react";

// How far the pointer must travel before we call it a drag rather than a click.
// Below this, a shaky hand on a card still opens the course.
const DRAG_THRESHOLD_PX = 5;

// Touch momentum keeps firing scroll events after the finger is gone. We wait
// for the row to go quiet before repositioning it, because moving `scrollLeft`
// mid-animation kills the animation.
const SCROLL_IDLE_MS = 120;

// A horizontal strip of anything — course cards, category plaques — dragged
// with a mouse and swiped with a finger.
//
// With `loop` it runs endlessly in both directions; without it the strip has a
// first item and a last one, and stops at each. Looping suits a sampler row
// that is a window onto a longer list, which is what the subscription rows are.
// It suits a complete, countable set far less: reaching the end of the
// categories and finding the first one again reads as a bug, and takes away the
// "that is all of them" that hitting the end is there to say.
//
// The loop is three copies of the same cards laid side by side, with the real
// one in the middle. You always start on the middle copy, and whenever you
// scroll off either edge of it we move `scrollLeft` by exactly one copy-width
// — putting you back on the middle copy at the same visual position. Nothing
// moves on screen; only the number changes. That is the whole trick.
//
//   [clone][real][clone]        period = distance from one copy to the next
//         ^~~~~~^              valid resting range: [period, 2 * period)
//
// Three details are load-bearing:
//   - The clones are `aria-hidden`, and their links are taken out of the tab
//     order, so screen readers and Tab see one copy of each course, not three.
//     They stay clickable on purpose — at rest, part of what is on screen is
//     usually a clone.
//   - Cloning only happens when one copy is already wider than the row. With
//     fewer items than fit on screen there is nothing to loop, and repeating
//     them would just look like a bug.
//   - Snapping is switched off mid-drag. With `snap-mandatory` on, the row
//     fights the pointer and lands on a card boundary every frame.
// The strip is named by whichever of `headingId` and `label` the caller has:
// a row that already draws its own heading points at it, and one that does not
// — the category plaques — names itself instead.
//
// `gapClassName` is the one piece of the caller's layout the strip has to know,
// because the clones are its own elements and have to be spaced exactly like
// the copy between them, or the loop would step by the wrong distance.
//
// `loop` is opt-in rather than the default: a strip that simply ends is the
// ordinary case, and the endless one is the special effect.
//
// `rewindOn` sends the row back to its start whenever the value handed to it
// changes — the id of the open category, for the row of category plaques, so
// that every choice made from the row returns it to the beginning.
//
// `mouseDrag` is what a mouse may do to the row. Turned off, the arrows become
// the only way to move it on a desktop — a row of large cards is a shelf to be
// paged through rather than shoved, and grabbing one to slide the row is easy
// to do by accident when what you meant was to open the course under the
// pointer. It has no bearing on touch: a finger scrolls the row natively, this
// component never intercepts that, and taking swiping away from a phone would
// leave the row with no way to move at all.
export function DraggableStrip({
    headingId,
    label,
    previousLabel,
    nextLabel,
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
    loop?: boolean;
    rewindOn?: string;
    mouseDrag?: boolean;
    gapClassName?: string;
    className?: string;
    children: ReactNode;
}) {
    const stripRef = useRef<HTMLDivElement>(null);
    // First and second copy. Their offsets give us the period without having
    // to know anything about gaps or padding.
    const firstCopyRef = useRef<HTMLDivElement>(null);
    const realCopyRef = useRef<HTMLDivElement>(null);
    // The third copy, held only so its links can be taken out of the tab order
    // alongside the first one's. See the effect that does it.
    const lastCopyRef = useRef<HTMLDivElement>(null);

    // Off until measurement proves the items overflow the row. It is what
    // decides whether the arrows are worth drawing at all — there is nowhere to
    // page to when everything already fits.
    const [overflows, setOverflows] = useState(false);

    // Clones exist only when there is both something to loop and a caller
    // asking for a loop. Everywhere else the strip is the single real copy,
    // which is what gives it a first item and a last one.
    const looping = overflows && loop;

    const periodRef = useRef(0);
    // Distance from one card's left edge to the next one's. Every scroll the
    // arrows perform is a whole multiple of this, so the row can only ever come
    // to rest on a card boundary — never on a sliver of one.
    const cardStepRef = useRef(0);
    // The `scrollLeft` at which a card sits flush against the row's left edge.
    // Not zero — the row has horizontal padding — and guessing it wrong leaves
    // scroll-snap a few pixels to correct after every arrow press.
    const alignOriginRef = useRef(0);
    const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Pointer x and scroll position at press time, plus whether we have passed
    // the threshold. A ref, not state: this changes every mousemove and no
    // pixel of it belongs in a render.
    const drag = useRef<{
        pointerId: number;
        startX: number;
        startScroll: number;
        moved: boolean;
    } | null>(null);

    // Measure on mount and on every resize: whether to loop at all, how wide a
    // copy is, and — the first time clones appear — park the row on the middle
    // copy. Layout effect, so the parking happens before the browser paints.
    useLayoutEffect(() => {
        const strip = stripRef.current;
        const realCopy = realCopyRef.current;
        if (!strip || !realCopy) return;

        const measure = () => {
            const doesOverflow = realCopy.offsetWidth > strip.clientWidth;
            setOverflows(doesOverflow);

            const firstCard = realCopy.children[0] as HTMLElement | undefined;
            const secondCard = realCopy.children[1] as HTMLElement | undefined;
            cardStepRef.current = firstCard
                ? (secondCard
                      ? secondCard.offsetLeft - firstCard.offsetLeft
                      : firstCard.offsetWidth)
                : 0;
            alignOriginRef.current = firstCard
                ? firstCard.getBoundingClientRect().left
                  - strip.getBoundingClientRect().left
                  + strip.scrollLeft
                : 0;

            // No clones — either nothing overflows, or this strip does not
            // loop — means no period, which is what every piece of loop
            // arithmetic below checks before doing anything.
            const firstCopy = firstCopyRef.current;
            if (!doesOverflow || !firstCopy) {
                periodRef.current = 0;
                return;
            }

            const period = realCopy.offsetLeft - firstCopy.offsetLeft;
            const isFirstMeasurement = periodRef.current === 0;
            periodRef.current = period;

            // Park on the middle copy, on the nearest card boundary, so
            // scroll-snap has nothing to correct the moment anyone touches it.
            if (isFirstMeasurement) {
                const cardStep = cardStepRef.current;
                const origin = alignOriginRef.current;
                strip.scrollLeft = cardStep > 0
                    ? origin + Math.round((period - origin) / cardStep) * cardStep
                    : period;
            }
        };

        measure();
        const observer = new ResizeObserver(measure);
        observer.observe(strip);
        observer.observe(realCopy);
        return () => observer.disconnect();
        // `looping` is read back through the refs it creates, so the effect has
        // to run again once the clones exist to measure the period.
    }, [looping]);

    // Take the clones' links out of the tab order, without taking them out of
    // reach of the pointer.
    //
    // The clones used to carry `inert`, which does both — and the second half
    // of that was a bug you could click on. The row rests anywhere inside the
    // middle copy, and the viewport is narrower than a copy, so the cards
    // filling the right-hand side of the screen are routinely the third copy's:
    // real-looking cards that swallowed every click, in a pattern that changed
    // each time the row moved because a different copy had slid under the
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
    // A layout effect, so the row is already at its start in the first frame
    // anyone sees — moving it after a paint would show the old position for an
    // instant and read as a glitch rather than as a reset.
    useLayoutEffect(() => {
        const strip = stripRef.current;
        if (!strip || rewindOn == null) return;
        strip.scrollLeft = 0;
    }, [rewindOn]);

    // Bring `scrollLeft` back into [period, 2 * period) — the middle copy.
    // Returns how much it moved, because a drag in progress is holding a
    // scroll position from before the jump and has to be corrected by the
    // same amount.
    const normalize = useCallback(() => {
        const strip = stripRef.current;
        const period = periodRef.current;
        if (!strip || period === 0) return 0;

        if (strip.scrollLeft >= period * 2) {
            strip.scrollLeft -= period;
            return -period;
        }
        if (strip.scrollLeft < period) {
            strip.scrollLeft += period;
            return period;
        }
        return 0;
    }, []);

    // Any scroll we did not cause directly — touch swipes, momentum, the
    // keyboard, a smooth arrow animation — is repositioned once it settles.
    function onScroll() {
        if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
        idleTimerRef.current = setTimeout(() => {
            if (!drag.current?.moved) normalize();
        }, SCROLL_IDLE_MS);
    }

    // As many whole cards as fit, per press. Paging by the raw row width
    // instead would stop partway through a card and leave `snap-mandatory` to
    // drag it into place afterwards — one smooth movement followed by a jerk.
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
        // A page holds at least one card even if a single card is wider than
        // the row, or the arrows would do nothing at all.
        const cardsPerPage = cardStep > 0
            ? Math.max(1, Math.floor(strip.clientWidth / cardStep))
            : 0;
        const step = cardsPerPage > 0 ? cardsPerPage * cardStep : strip.clientWidth;

        if (period > 0) {
            normalize();
            if (direction === 1 && strip.scrollLeft + step > strip.scrollWidth - strip.clientWidth) {
                strip.scrollLeft -= period;
            } else if (direction === -1 && strip.scrollLeft - step < 0) {
                strip.scrollLeft += period;
            }
        }

        // Rounded onto the card grid rather than added to wherever we are: a
        // drag can leave the row mid-card, and adding a whole page to a
        // half-card offset just carries that offset along forever.
        const raw = strip.scrollLeft + direction * step;
        const origin = alignOriginRef.current;
        const target = cardStep > 0
            ? origin + Math.round((raw - origin) / cardStep) * cardStep
            : raw;

        strip.scrollTo({ left: target, behavior: "smooth" });
    }

    function onPointerDown(event: React.PointerEvent<HTMLDivElement>) {
        // Nothing below ever runs on a row the mouse may not drag. It is the
        // only gate needed: no drag is ever started, so the move and release
        // handlers find no drag to continue, and the click suppression finds
        // none to suppress.
        if (!mouseDrag) return;

        // Touch and pen already scroll natively, and hijacking them breaks
        // vertical scrolling through the page.
        if (event.pointerType !== "mouse" || event.button !== 0) return;
        const strip = stripRef.current;
        if (!strip) return;

        drag.current = {
            pointerId: event.pointerId,
            startX: event.clientX,
            startScroll: strip.scrollLeft,
            moved: false,
        };
    }

    function onPointerMove(event: React.PointerEvent<HTMLDivElement>) {
        const state = drag.current;
        const strip = stripRef.current;
        if (!state || !strip || event.pointerId !== state.pointerId) return;

        const distance = event.clientX - state.startX;

        if (!state.moved) {
            if (Math.abs(distance) < DRAG_THRESHOLD_PX) return;
            state.moved = true;
            // Only now do we take the pointer, so a plain click on a card is
            // never stolen from the link underneath it.
            strip.setPointerCapture(state.pointerId);
            strip.style.scrollSnapType = "none";
            strip.style.cursor = "grabbing";
        }

        // Content moves with the pointer, so scrollLeft moves against it.
        strip.scrollLeft = state.startScroll - distance;
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
                // this row is never wanted — its contents change exactly when
                // a navigation redraws the items, and the position is managed
                // here.
                // The grab cursor only where grabbing does something. Left on
                // a row that cannot be dragged, it promises a movement that
                // never comes — and it is the one thing on screen telling
                // people to try.
                className={`flex snap-x snap-mandatory overflow-x-auto px-1 pb-2 scrollbar-none [overflow-anchor:none] [&::-webkit-scrollbar]:hidden ${
                    mouseDrag ? "cursor-grab" : ""
                } ${gapClassName}`}
            >
                {looping && (
                    <div
                        ref={firstCopyRef}
                        aria-hidden
                        className={`flex shrink-0 ${gapClassName}`}
                    >
                        {children}
                    </div>
                )}
                <div ref={realCopyRef} className={`flex shrink-0 ${gapClassName}`}>
                    {children}
                </div>
                {looping && (
                    <div
                        ref={lastCopyRef}
                        aria-hidden
                        className={`flex shrink-0 ${gapClassName}`}
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
                        label={previousLabel}
                        onClick={() => page(-1)}
                    />
                    <PageButton
                        direction={1}
                        label={nextLabel}
                        onClick={() => page(1)}
                    />
                </>
            )}
        </div>
    );
}

// Sits over the row's edge, on mouse-driven devices only — a finger has the
// whole strip to swipe and does not need a target overlapping the first card.
// Hidden until the row is hovered, but always shown once focused, or a keyboard
// would Tab to something invisible.
//
// Invisible is not absent: at `opacity-0` this was still a 3rem column of
// click-catcher down each edge of the row, quietly eating presses meant for
// the cards beneath it. `pointer-events-none` is what makes hidden mean
// hidden, and it lifts in step with the opacity — by the time the button can
// take a click it can also be seen. The two states are driven by the same
// `group-hover`, so they cannot disagree.
function PageButton({
    direction,
    label,
    onClick,
}: {
    direction: 1 | -1;
    label: string;
    onClick: () => void;
}) {
    const Chevron = direction === 1 ? ChevronRight : ChevronLeft;

    return (
        <button
            type="button"
            onClick={onClick}
            aria-label={label}
            className={`absolute top-0 bottom-2 z-10 hidden w-12 items-center justify-center bg-[#0a1628]/80 text-gold opacity-0 backdrop-blur-sm transition-opacity pointer-events-none group-hover:pointer-events-auto group-hover:opacity-100 focus-visible:pointer-events-auto focus-visible:opacity-100 focus-visible:outline-2 focus-visible:outline-yellow-200 pointer-fine:flex ${
                direction === 1
                    ? "right-0 rounded-l-2xl"
                    : "left-0 rounded-r-2xl"
            }`}
        >
            <Chevron className="size-7" />
        </button>
    );
}
