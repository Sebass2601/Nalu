'use client'

import React, { useEffect, useRef, useState } from "react";
import CategoryButton from "@/components/ui/CategoryButton";
import { HOTSPOTS, type Entrance } from "@/components/ui/parallaxEntrances";

// Bounds camera coordinates to the visible image range.
const clamp = (n: number) => Math.min(100, Math.max(0, n));

// Motion tuning for touch panning and layer depth.
const SENSITIVITY = 0.7; // Drag response multiplier.
const FRICTION = 0.93;   // Momentum decay applied per animation frame.
const PARALLAX = 0.45;   // Background movement relative to the foreground.
const DRAG_SLOP = 8;     // Pixels of finger travel that turn a tap into a pan.

// Natural pixel size of the layer images, needed to reproduce the geometry
// that `background-size: cover` gives the foreground layer.
const IMAGE = { width: 1536, height: 1024 };

// Button size relative to the foreground layer at its natural resolution.
const BUTTON_SCALE = 0.62;

const POSITIONS = new Map(HOTSPOTS.map(({ id, x, y }) => [id, { x, y }]));

export default function MultiLayerParallax({
    entrances = [],
}: {
    entrances?: Entrance[];
}) {
    // Camera position over the image, expressed as 0-100 percentages on each axis.
    const [pos, setPos] = useState({ x: 50, y: 50 });

    // Live size of the viewport element, used to place the buttons over the artwork.
    const [viewport, setViewport] = useState({ width: 0, height: 0 });
    const containerRef = useRef<HTMLDivElement>(null);

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
        // release does not open whichever button sits under the finger.
        if (
            Math.abs(t.clientX - drag.current.touchX) +
            Math.abs(t.clientY - drag.current.touchY) > DRAG_SLOP
        ) {
            dragged.current = true;
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
                    backgroundImage: "url(/parallax/layer_1.png)",
                    backgroundSize: "cover",
                    backgroundPosition: `${bgX}% ${bgY}%`,
                    backgroundRepeat: "no-repeat",
                }}
            />
            {/* Foreground layer tracks the full camera position. */}
            <div
                className="absolute inset-0 z-10"
                style={{
                    backgroundImage: "url(/parallax/layer_2.png)",
                    backgroundSize: "cover",
                    backgroundPosition: `${pos.x}% ${pos.y}%`,
                    backgroundRepeat: "no-repeat",
                }}
            />
            {/* Overlay laid exactly over the foreground layer, so the buttons
                inside it can be positioned in the artwork's own coordinates. */}
            {cover > 0 && (
                <div
                    className="absolute z-20"
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
                    {entrances.map((entrance) => {
                        const position = POSITIONS.get(entrance.id);
                        if (!position) return null;
                        return (
                            <div
                                key={entrance.id}
                                className="absolute"
                                style={{
                                    left: `${position.x * 100}%`,
                                    top: `${position.y * 100}%`,
                                    // Centre the button on its entrance, then size it
                                    // in step with the artwork rather than the screen.
                                    transform: `translate(-50%, -50%) scale(${cover * BUTTON_SCALE})`,
                                }}
                            >
                                <CategoryButton href={entrance.href}>{entrance.label}</CategoryButton>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
