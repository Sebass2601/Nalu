'use client'

import React, { useEffect, useRef, useState, type ReactNode } from "react";
import ReactDOM from "react-dom";
import { ChevronsLeftIcon, ChevronsRightIcon } from "lucide-react";
import CategoryButton from "@/components/ui/CategoryButton";
import ParallaxCurtain from "@/components/ui/ParallaxCurtain";
import { type Entrance } from "@/components/ui/parallaxEntrances";
import { cinzel } from "@/components/ui/fonts";
import { cn } from "@/lib/utils";

// Bounds camera coordinates to the visible image range.
const clamp = (n: number) => Math.min(100, Math.max(0, n));

// Motion tuning for touch panning and layer depth.
const SENSITIVITY = 0.7; // Drag response multiplier.
const FRICTION = 0.93;   // Momentum decay applied per animation frame.
const PARALLAX = 0.45;   // Background movement relative to the foreground.
const DRAG_SLOP = 8;     // Pixels of finger travel that turn a tap into a pan.

// Natural pixel size of the layer images, needed to reproduce the geometry
// that `background-size: cover` gives the foreground layer. Every scene is
// painted at this size; a scene that was not would need this passed in, since
// the buttons are placed with it and would sit crooked otherwise.
const IMAGE = { width: 1536, height: 1024 };

// Button size relative to the foreground layer at its natural resolution.
//
// This is the castle's figure, and it is the default because the castle is the
// harder case: it is the scene whose plaques have neighbours to collide with. A
// scene with a lone doorway can size its plaque for legibility alone and passes
// its own.
//
// Doorways sit at fixed points in the artwork, so both the gaps between them and
// the plaques themselves scale with `cover` — which means the point where two
// neighbours touch is a fixed multiple of it, not a pixel size. Measured across
// screens from 360x640 to 1440x900 with all nine doorways filled, that multiple
// is 1.079 below `sm` and 0.944 above it, the difference being the plaque's own
// padding, which tightens on a phone.
//
// 0.86 is the largest value that clears the stricter of the two with room to
// spare, and it is what makes the lettering readable on a phone: the artwork is
// scaled to fill the height there and ends up about three times wider than the
// screen, so the old 0.62 — in proportion to the castle, and to nothing anyone
// can actually see — put the labels near 7px.
const DEFAULT_BUTTON_SCALE = 0.86;

// Whether this visit has already been told the scene can be dragged. Kept in
// sessionStorage rather than localStorage: the hint costs a second to anyone who
// already knows — they drag, it goes — while "once ever, on this device" would
// mean someone returning months later, or arriving on a new phone, gets nothing.
//
// The path is part of the key, so the salon and the castle each get their own
// telling. They are two different pictures with the scene lying in different
// directions, and having dragged one is not the same as knowing the other moves.
const HINT_SEEN = "nalu:parallax-pan-hint-seen";

// One scene: two layers of artwork the camera moves over at different rates,
// and the doorways drawn on top of the nearer one. Which painting and which
// doorways are the caller's to say, so the same interaction serves the salon at
// `/` and the castle at `/fetch-courses`.
export default function MultiLayerParallax({
    background,
    foreground,
    entrances = [],
    buttonScale = DEFAULT_BUTTON_SCALE,
    inscription,
}: {
    background: string;
    foreground: string;
    entrances?: Entrance[];
    buttonScale?: number;
    // Lettering painted into the scene: given a place in the artwork and drawn
    // there on exactly the terms the plaques are, scaling and travelling with
    // the picture rather than sitting on the glass in front of it.
    inscription?: { node: ReactNode; x: number; y: number };
}) {
    // Both layers are CSS backgrounds, which the browser cannot know it needs
    // until it has fetched and parsed the stylesheet naming them. These put a
    // <link rel="preload"> in the document head, so the artwork — the only thing
    // on either page worth looking at — starts downloading with the page rather
    // than a round trip later.
    ReactDOM.preload(background, { as: "image" });
    ReactDOM.preload(foreground, { as: "image" });

    // Camera position over the image, expressed as 0-100 percentages on each axis.
    const [pos, setPos] = useState({ x: 50, y: 50 });

    // Live size of the viewport element, used to place the buttons over the artwork.
    const [viewport, setViewport] = useState({ width: 0, height: 0 });
    const containerRef = useRef<HTMLDivElement>(null);

    // Whether the drag hint is showing. Starts closed on purpose: sessionStorage
    // does not exist while this is being prerendered, so a server that guessed
    // "open" would hand the browser markup it then had to correct. It opens in
    // the effect below instead, which also lets it fade in over the artwork
    // rather than arriving stamped on top of it.
    const [hintVisible, setHintVisible] = useState(false);

    // Gesture state is kept in refs to avoid rendering on every input sample.
    const drag = useRef<{ touchX: number; touchY: number; posX: number; posY: number } | null>(null);
    const dragged = useRef(false);                     // Whether the current touch is a pan, not a tap.
    const velocity = useRef({ x: 0, y: 0 });          // Current momentum in position units per frame.
    const lastSample = useRef({ x: 50, y: 50 });      // Previous camera sample for velocity tracking.
    const momentumId = useRef<number | null>(null);   // Active momentum animation frame.
    const lastTouch = useRef(0);                       // Timestamp of the latest touch input.

    // Cancels active momentum before starting a new gesture or unmounting.
    const stopMomentum = () => {
        if (momentumId.current !== null) {
            cancelAnimationFrame(momentumId.current);
            momentumId.current = null;
        }
    };

    // Continues touch movement with decaying momentum after release.
    const startMomentum = () => {
        stopMomentum();
        const step = () => {
            const v = velocity.current;
            // Stop once movement is visually negligible.
            if (Math.abs(v.x) < 0.02 && Math.abs(v.y) < 0.02) {
                momentumId.current = null;
                return;
            }
            setPos((prev) => {
                const nextX = clamp(prev.x + v.x);
                const nextY = clamp(prev.y + v.y);
                // Drop momentum on axes that have reached an image boundary.
                if (nextX === 0 || nextX === 100) v.x = 0;
                if (nextY === 0 || nextY === 100) v.y = 0;
                return { x: nextX, y: nextY };
            });
            v.x *= FRICTION;
            v.y *= FRICTION;
            momentumId.current = requestAnimationFrame(step);
        };
        momentumId.current = requestAnimationFrame(step);
    };

    // Read from `window` rather than `usePathname`, because the only two places
    // that ask are a mount effect and a touch handler — both of them the
    // browser's side of the line, where the address is simply a fact and needs
    // no hook to reach it.
    const hintKey = () => `${HINT_SEEN}:${window.location.pathname}`;

    // Retires the hint, and remembers that it has been. Wrapped because
    // sessionStorage throws rather than returning null when a browser has
    // storage switched off or is in a locked-down private mode — and a hint
    // about swiping is not worth taking the page down for.
    const dismissHint = () => {
        setHintVisible(false);
        try {
            sessionStorage.setItem(hintKey(), "1");
        } catch {}
    };

    // Ask on arrival whether this visit has seen it yet.
    //
    // Opened on the next frame rather than in the effect itself, which is also
    // what makes it fade rather than appear: a transition only runs if the
    // browser has painted the state being transitioned from, so the element has
    // to exist at zero opacity for a frame before it is told to become opaque.
    // Setting it here and now would skip straight to opaque with nothing to
    // animate — and would be a synchronous state write inside an effect, which
    // is the cascade the compiler's lint rule is there to stop.
    useEffect(() => {
        let seen = true;
        try {
            seen = sessionStorage.getItem(hintKey()) != null;
        } catch {}
        if (seen) return;

        const frame = requestAnimationFrame(() => setHintVisible(true));
        return () => cancelAnimationFrame(frame);
    }, []);

    // Ensure no animation frame remains scheduled after unmount.
    useEffect(() => stopMomentum, []);

    // Track the viewport size so the button overlay can follow the artwork.
    useEffect(() => {
        const element = containerRef.current;
        if (!element) return;
        const observer = new ResizeObserver(([entry]) => {
            const { width, height } = entry.contentRect;
            setViewport({ width, height });
        });
        observer.observe(element);
        return () => observer.disconnect();
    }, []);

    // Desktop pointer movement maps directly to the camera position.
    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
        // Ignore synthetic mouse events emitted immediately after touch input.
        if (Date.now() - lastTouch.current < 600) return;
        const { left, top, width, height } = e.currentTarget.getBoundingClientRect();
        setPos({
            x: clamp(((e.clientX - left) / width) * 100),
            y: clamp(((e.clientY - top) / height) * 100),
        });
    };

    // Start a touch gesture from the current camera position.
    const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
        lastTouch.current = Date.now();
        stopMomentum();
        dragged.current = false;
        const t = e.touches[0];
        drag.current = { touchX: t.clientX, touchY: t.clientY, posX: pos.x, posY: pos.y };
        lastSample.current = { x: pos.x, y: pos.y };
        velocity.current = { x: 0, y: 0 };
    };

    // Pan with the touch gesture and capture velocity for release momentum.
    const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
        if (!drag.current) return;
        lastTouch.current = Date.now();
        const t = e.touches[0];
        const { width, height } = e.currentTarget.getBoundingClientRect();

        // Past a few pixels of travel the gesture counts as panning, so the
        // release does not open whichever button sits under the finger. That
        // same threshold is the moment the hint has been answered — the finger
        // is moving the scene, which is the one thing the hint was there to say
        // — so it retires here rather than on any touch at all, which a tap on a
        // doorway would otherwise satisfy without teaching anyone anything.
        if (
            !dragged.current &&
            Math.abs(t.clientX - drag.current.touchX) +
            Math.abs(t.clientY - drag.current.touchY) > DRAG_SLOP
        ) {
            dragged.current = true;
            dismissHint();
        }

        // Convert finger travel into percentage-based camera movement.
        const dx = ((t.clientX - drag.current.touchX) / width) * 100 * SENSITIVITY;
        const dy = ((t.clientY - drag.current.touchY) / height) * 100 * SENSITIVITY;

        // Invert movement so dragging behaves like pulling the scene itself.
        const nextX = clamp(drag.current.posX - dx);
        const nextY = clamp(drag.current.posY - dy);

        // Velocity is the frame-to-frame camera delta.
        velocity.current = { x: nextX - lastSample.current.x, y: nextY - lastSample.current.y };
        lastSample.current = { x: nextX, y: nextY };

        setPos({ x: nextX, y: nextY });
    };

    // Release touch input and continue with momentum.
    const handleTouchEnd = () => {
        lastTouch.current = Date.now();
        drag.current = null;
        startMomentum();
    };

    // Offset the background less than the foreground to create depth.
    const bgX = 50 + (pos.x - 50) * PARALLAX;
    const bgY = 50 + (pos.y - 50) * PARALLAX;

    // Reproduce the foreground layer's geometry. `cover` scales the image until
    // it fills both axes, which is the larger of the two ratios; whatever spills
    // past the viewport is then shared between the two sides by the same
    // percentage the camera uses as its background position.
    const cover = Math.max(viewport.width / IMAGE.width, viewport.height / IMAGE.height);
    const imageWidth = IMAGE.width * cover;
    const imageHeight = IMAGE.height * cover;
    const imageLeft = (viewport.width - imageWidth) * (pos.x / 100);
    const imageTop = (viewport.height - imageHeight) * (pos.y / 100);

    return (
        <>
        {/* Covers the scene until both layers above can be painted, then fades
            off it. A sibling rather than a child: it is `fixed` and covers the
            navbar too, so nesting it inside the container would only put it
            inside gesture handlers it has no business hearing.

            Keyed on the artwork it is covering, so a change of scene is a new
            curtain rather than the old one carrying its state over. Without
            this, the salon and the castle are the same component in the same
            position of the tree, which is React's definition of the same
            element — so a curtain that had already finished and unmounted
            itself on one painting would stay finished on the next, and the
            second scene would load with nothing over it at all. */}
        <ParallaxCurtain
            key={`${background}|${foreground}`}
            background={background}
            foreground={foreground}
        />

        <div
            ref={containerRef}
            onMouseMove={handleMouseMove}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            // Keep gestures dedicated to the parallax interaction.
            className="w-full h-dvh overflow-hidden relative touch-none overscroll-none select-none"
        >
            {/* Background layer with reduced camera movement. */}
            <div
                className="absolute inset-0 z-0"
                style={{
                    backgroundImage: `url(${background})`,
                    backgroundSize: "cover",
                    backgroundPosition: `${bgX}% ${bgY}%`,
                    backgroundRepeat: "no-repeat",
                }}
            />
            {/* Foreground layer tracks the full camera position. */}
            <div
                className="absolute inset-0 z-10"
                style={{
                    backgroundImage: `url(${foreground})`,
                    backgroundSize: "cover",
                    backgroundPosition: `${pos.x}% ${pos.y}%`,
                    backgroundRepeat: "no-repeat",
                }}
            />
            {/* Overlay laid exactly over the foreground layer, so the buttons
                inside it can be positioned in the artwork's own coordinates.

                Rendered even before there is an artwork to lay it over, because
                everything the page actually says is in here — the heading, the
                paragraph under it, the wording on every doorway. `cover` is 0
                until the ResizeObserver below has measured the viewport, which
                cannot happen on a server, so gating the markup on it would have
                meant serving a page whose entire text arrived only after
                hydration: nothing in the HTML for a crawler to read, and a beat
                of bare artwork for everyone else.

                So it is drawn from the first byte and merely kept from showing
                until it can be placed. Transparent rather than `invisible`, so
                it stays in the accessibility tree, and deaf to the pointer while
                it is, so the collapsed doorways cannot be clicked in the corner
                they are stacked in. */}
            <div
                className={cover > 0 ? "absolute z-20" : "pointer-events-none absolute z-20 opacity-0"}
                style={{
                    left: imageLeft,
                    top: imageTop,
                    width: imageWidth,
                    height: imageHeight,
                }}
                // Swallow the click that closes a pan gesture.
                onClickCapture={(e) => {
                    if (!dragged.current) return;
                    e.preventDefault();
                    e.stopPropagation();
                }}
            >
                {/* Drawn before the plaques, so anything that ever did overlap
                    one would pass behind it, and deaf to the pointer: it is
                    lettering, and a block of text this size would otherwise be a
                    dead patch in the middle of the scene where dragging did
                    nothing. */}
                {inscription && (
                    <div
                        className="pointer-events-none absolute"
                        style={{
                            left: `${inscription.x * 100}%`,
                            top: `${inscription.y * 100}%`,
                            // Scaled by `cover` alone, unlike the plaques: it is
                            // written at the artwork's own resolution, so it
                            // grows and shrinks with the picture at a rate of
                            // one to one.
                            transform: `translate(-50%, -50%) scale(${cover})`,
                        }}
                    >
                        {inscription.node}
                    </div>
                )}

                {entrances.map((entrance) => (
                    <div
                        key={entrance.id}
                        className="absolute"
                        style={{
                            left: `${entrance.x * 100}%`,
                            top: `${entrance.y * 100}%`,
                            // Centre the button on its entrance, then size it in
                            // step with the artwork rather than the screen.
                            transform: `translate(-50%, -50%) scale(${cover * buttonScale})`,
                        }}
                    >
                        <CategoryButton href={entrance.href} caption={entrance.caption}>
                            {entrance.label}
                        </CategoryButton>
                    </div>
                ))}
            </div>

            {/* The first-visit hint.
                On a phone the artwork is scaled to fill the height and ends up
                about three times wider than the screen, so most of the scene is
                off both edges — and a still picture has no way of saying so. A
                visitor who never thinks to drag sees a third of it and leaves.

                `pointer-coarse` rather than a width breakpoint, because the
                question is what is driving the page rather than how wide it is:
                a mouse reveals the movement the instant it enters the page,
                since the camera follows it unbidden, so a pointer user has
                already been told. A narrow desktop window needs no hint and a
                large tablet does.

                Deaf to the pointer, so it cannot swallow the very gesture it is
                asking for. Ink and not gold: globals.css keeps gold for what you
                press or navigate by, and this is only something to read. */}
            <div
                aria-hidden={!hintVisible}
                className={cn(
                    "pointer-events-none absolute inset-x-0 bottom-0 z-30 hidden h-64 flex-col items-center justify-end pb-10 pointer-coarse:flex",
                    // Slow enough to read as the page settling rather than
                    // something appearing, both on the way in and the way out.
                    "transition-opacity duration-700 ease-out",
                    hintVisible ? "opacity-100" : "opacity-0"
                )}
            >
                {/* The difuminado, kept as its own layer so it can be masked
                    without taking the lettering with it: the mask fades the
                    whole band out towards the top, which is what stops the blur
                    ending in a straight line across the middle of the painting.
                    The gradient underneath does the darkening, and would carry
                    the effect on its own if a browser declined the rest. */}
                <span
                    aria-hidden
                    className="absolute inset-0 bg-linear-to-t from-[#0a1628]/95 via-[#0a1628]/55 to-transparent backdrop-blur-md"
                    style={{
                        maskImage: "linear-gradient(to top, #000 35%, transparent)",
                        WebkitMaskImage: "linear-gradient(to top, #000 35%, transparent)",
                    }}
                />

                {/* Stacked rather than the arrows flanking the words, which is
                    what lets both be this size: set in a row, the line runs past
                    360px and a small phone would break it. Stacked, the arrows
                    also get to sit at the two edges of the band, which says
                    where the scene continues rather better than a pair tucked
                    against the text. */}
                <div className={`${cinzel.className} relative flex w-full flex-col items-center gap-3`}>
                    {/* Steps down on the narrowest phones. Twenty-one letters
                        at 20px and this much tracking run about 340px, which a
                        320px screen cannot hold and a 360px one holds only just;
                        the smaller step gives both room to breathe and is still
                        far larger than the line it replaced. */}
                    <span className="indent-[0.1em] text-lg font-semibold tracking-widest text-ink-bright uppercase min-[380px]:text-xl">
                        Desliza para explorar
                    </span>
                    <div className="flex w-full max-w-xs items-center justify-between px-2 text-ink">
                        <ChevronsLeftIcon
                            aria-hidden
                            className="size-10 animate-drift-out-left motion-reduce:animate-none"
                        />
                        <ChevronsRightIcon
                            aria-hidden
                            className="size-10 animate-drift-out-right motion-reduce:animate-none"
                        />
                    </div>
                </div>
            </div>
        </div>
        </>
    );
}
