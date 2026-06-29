'use client'

import React, { useEffect, useRef, useState } from "react";

// Bounds camera coordinates to the visible image range.
const clamp = (n: number) => Math.min(100, Math.max(0, n));

// Motion tuning for touch panning and layer depth.
const SENSITIVITY = 0.7; // Drag response multiplier.
const FRICTION = 0.93;   // Momentum decay applied per animation frame.
const PARALLAX = 0.45;   // Background movement relative to the foreground.

export default function MultiLayerParallax() {
    // Camera position over the image, expressed as 0-100 percentages on each axis.
    const [pos, setPos] = useState({ x: 50, y: 50 });

    // Gesture state is kept in refs to avoid rendering on every input sample.
    const drag = useRef<{ touchX: number; touchY: number; posX: number; posY: number } | null>(null);
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

    return (
        <div
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
        </div>
    );
}
