'use client'

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";

// `useLayoutEffect` is what this needs and `useEffect` is what the server can
// run, so it takes whichever exists.
//
// The difference is the entire point rather than a lint workaround. `useEffect`
// runs AFTER the browser has painted, so on a page whose artwork is already in
// cache it would paint one frame of navy before discovering there was never
// anything to wait for — a flash of the loading screen over a page that had
// already loaded. `useLayoutEffect` runs after the DOM is built and before that
// paint, which is the only moment at which the curtain can decide not to exist.
//
// React warns if `useLayoutEffect` is called while server-rendering, and it is
// right to: there is no layout on a server and no paint to be ahead of. On that
// pass the curtain is simply drawn, which is correct — a server cannot know
// what the visitor's cache holds, and the first visit is exactly the one where
// the artwork has to be downloaded.
const useBeforePaint = typeof window === "undefined" ? useEffect : useLayoutEffect;

// The shortest the curtain is allowed to be on screen once it has decided to
// appear at all.
//
// The check below keeps it away when the artwork is already in cache, but cache
// is not the only fast case: a layer that was still a few kilobytes from done
// when the page mounted reports `complete === false`, so the curtain commits to
// showing — and then the decode lands thirteen milliseconds later. Measured, not
// guessed: a browser run caught exactly that, a curtain that existed for under a
// single frame at 60Hz.
//
// A blink like that is worse than either alternative. It is too short to read as
// loading and just long enough to register as something having gone wrong. So
// once the curtain is up it stays up long enough to have been meant, and only
// then begins its fade.
const MIN_VISIBLE_MS = 300;

// Above this many milliseconds on screen, the curtain has been seen by someone
// and owes them a fade rather than a disappearance.
//
// A couple of frames. The two cases being told apart are nowhere near the line:
// a curtain drawn by the server has been up for a few hundred milliseconds by
// the time React reaches it, and one created by a client-side navigation has
// been up for none at all, because the effect that asks runs before the paint
// that would show it.
const SEEN_MS = 50;

// How long this element has actually been on screen, asked of the browser's own
// animation clock.
//
// The obvious version of this — a flag saying whether a curtain had been
// mounted before — was wrong, and wrong in a way only a browser could show. The
// effect runs more than once against the SAME element: React's StrictMode
// double-invokes it in development, and hydration does something equivalent in
// production. So the flag was set by the first invocation and misread by the
// second, and every server-drawn curtain was torn away without its fade.
//
// The flaw was tracking React's lifecycle to answer a question about the
// screen. `curtain-hold` starts the instant the browser applies the stylesheet,
// so its `currentTime` is precisely how long this element has been visible —
// measured by the compositor, indifferent to how many times a component
// re-ran, and exactly the thing worth knowing.
const millisecondsOnScreen = (element: HTMLElement | null) =>
    element?.getAnimations?.().reduce(
        (longest, animation) => Math.max(longest, Number(animation.currentTime) || 0),
        0
    ) ?? 0;

// What the two parallax pages show while their artwork is still on the wire.
//
// Each of them paints two webp layers of about 300-400KB, and until those
// arrive there is nothing on screen but the navy `layout.tsx` puts on the body
// — no mark, no motion, no reason to believe the page is doing anything. This
// is that gap, given something to look at and an exit that fades rather than
// cuts.
//
// It covers everything, navbar included, which is why it is `fixed` and above
// the bar's own z-50 rather than living inside the parallax container. A
// half-covered screen would show the bar's gold rule and, once the session
// streamed in, the Nalu mark twice — once in the corner and once in the middle.
export default function ParallaxCurtain({
    background,
    foreground,
}: {
    background: string;
    foreground: string;
}) {
    // `holding` is the state the server renders, and it has to be: a curtain
    // that waited for hydration to appear would arrive after the very frame it
    // exists to cover. `gone` unmounts it, so a full-screen compositing layer
    // does not sit over the artwork for the rest of the visit.
    const [phase, setPhase] = useState<"holding" | "leaving" | "gone">("holding");

    // The curtain itself, so the effect below can ask the browser how long it
    // has been on screen rather than infer it from React's lifecycle.
    const ref = useRef<HTMLDivElement>(null);

    // Ask the browser when the artwork can actually be painted.
    //
    // The layers are CSS `background-image`s, and a CSS background fires no
    // event anyone can listen to — so the question has to be asked separately,
    // against the same two URLs. That costs no second download: MultiLayerParallax
    // already has a <link rel="preload"> out for both, and the stylesheet will
    // ask for them again, so all three requests land on one cache entry.
    useBeforePaint(() => {
        let live = true;
        let timer: ReturnType<typeof setTimeout> | undefined;

        // Start the fade, but only from a curtain that is still up.
        //
        // `gone` is final, and it has to be said out loud because the artwork
        // can answer after the CSS backstop has already given up on it. On a
        // slow line that is not hypothetical: a throttled run had the backstop
        // retire the curtain at 8s and the decode land at 9.3s, which — without
        // this guard — walked the phase from `gone` back to `leaving` and put a
        // full-screen navy panel over a page the visitor had been reading for a
        // second and a half.
        const beginLeaving = () =>
            setPhase((current) => (current === "holding" ? "leaving" : current));

        // Read before anything can await, so the floor below is measured from
        // the moment the curtain went up rather than from whenever the artwork
        // happened to answer.
        const shownAt = performance.now();

        const probes = [background, foreground].map((src) => {
            // `window.Image`, not `Image` — next/image has that name here.
            const probe = new window.Image();
            probe.src = src;
            return probe;
        });

        // Nothing was ever waiting, and nobody has seen the curtain: drop it
        // where it stands.
        //
        // `complete` turns true synchronously when the browser already holds the
        // image, so asking here — before the paint this effect runs ahead of —
        // is the difference between a curtain that appears only when it is
        // needed and one that blinks over every navigation back to a page you
        // have already seen. That is the case on every trip back through the
        // arch: no curtain, no fade, not one frame of navy.
        //
        // Guarded by the time on screen, because the same test would otherwise
        // catch the server-drawn curtain, which by hydration is both fully
        // cached AND already in front of someone. That one has to fade.
        if (millisecondsOnScreen(ref.current) < SEEN_MS && probes.every((probe) => probe.complete)) {
            setPhase("gone");
            return;
        }

        // Otherwise there is a genuine wait, and the curtain sits over it until
        // both layers can be painted.
        //
        // `decode()` rather than `onload`, because they answer different
        // questions. `onload` means the bytes are in; `decode()` means the
        // pixels are ready to paint. On an image this size the gap between them
        // is long enough to see, and it is the second one the curtain waits for.
        //
        // A layer that 404s or stalls must not trap the curtain, so the
        // rejection is swallowed: the pair resolves, the curtain leaves, and the
        // page shows whatever did load. That is the honest outcome, and the same
        // one the CSS backstop in globals.css would reach eight seconds later.
        void Promise.all(
            probes.map((probe) => probe.decode().catch(() => undefined))
        ).then(() => {
            if (!live) return;

            // Serve out the rest of the floor if the artwork beat it, and leave
            // straight away if it did not — which is the ordinary case, since
            // anything slow enough to need a curtain is slow enough to outlast
            // 300ms on its own.
            const remaining = MIN_VISIBLE_MS - (performance.now() - shownAt);
            if (remaining <= 0) {
                beginLeaving();
                return;
            }

            timer = setTimeout(() => {
                if (live) beginLeaving();
            }, remaining);
        });

        return () => {
            live = false;
            clearTimeout(timer);
        };
    }, [background, foreground]);

    if (phase === "gone") return null;

    const leaving = phase === "leaving";

    return (
        <div
            ref={ref}
            // Announced once on arrival rather than described as an image, so a
            // screen reader says the page is loading instead of naming a logo.
            role="status"
            // How anything else on the page finds out the curtain is still up.
            // The Samhain announcement waits on this rather than opening under
            // a screen the visitor cannot see through — `role="status"` cannot
            // serve, because every toast carries it too.
            data-curtain
            onAnimationEnd={(e) => {
                // Both the hold and the leave end here — the first at its eight
                // second backstop, the second when the fade finishes — and either
                // one means the curtain is done. Guarded against the mark's own
                // animation bubbling up from inside.
                if (e.target === e.currentTarget) setPhase("gone");
            }}
            className={cn(
                "fixed inset-0 z-60 flex items-center justify-center bg-[#0a1628]",
                // Deaf to the pointer only once it is on its way out. While it is
                // opaque it deliberately swallows clicks: the doorways underneath
                // become live as soon as the ResizeObserver has measured them,
                // and a tap on what looks like a blank navy screen should not
                // navigate somewhere.
                leaving ? "pointer-events-none animate-curtain-leave" : "animate-curtain-hold"
            )}
        >
            <span className="sr-only">Cargando</span>

            <div
                className={cn(
                    "flex flex-col items-center gap-7",
                    leaving && "animate-curtain-mark-leave"
                )}
            >
                {/* `alt=""` because the sr-only line above already says what is
                    happening, and "Nalu logo" read out mid-load says nothing a
                    visitor needs. Eager and high priority: on a screen holding
                    one thing, that thing should not be the last to arrive.
                    Next 16 deprecated `priority` in favour of `preload`, and the
                    docs steer to these two ahead of it. */}
                <Image
                    src="/nalu_logo.png"
                    alt=""
                    width={128}
                    height={128}
                    loading="eager"
                    fetchPriority="high"
                    className="size-24 sm:size-28"
                />

                {/* The ring: a faint gold circle with one brighter arc at its
                    top, turning. Gold rather than ink because globals.css keeps
                    ink for what you READ, and this is not lettering. */}
                <span
                    aria-hidden
                    className="size-9 animate-ring-spin rounded-full border-2 border-gold/25 border-t-gold motion-reduce:animate-ring-pulse"
                />
            </div>
        </div>
    );
}
