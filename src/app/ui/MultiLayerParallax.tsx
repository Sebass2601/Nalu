'use client'

import React, { useRef, useState } from "react";

// Keeps a number inside the 0–100 range (used so we never pan past the image edges)
const clamp = (n: number) => Math.min(100, Math.max(0, n));

export default function MultiLayerParallax() {
    // "pos" is the logical look-position, 0–100 on each axis. 50/50 = resting in the centre.
    // Both mouse and touch feed this same value, so the depth effect below is shared.
    const [pos, setPos] = useState({ x: 50, y: 50 });

    // Where the finger first landed + what pos was at that moment.
    // Lets us pan *relative* to the drag (like dragging a map) instead of jumping.
    const dragStart = useRef<{ touchX: number; touchY: number; posX: number; posY: number } | null>(null);

    // Turn 0–100 into -1..1 (so 50 = 0 = centred, 0 = -1 = full left, 100 = +1 = full right).
    const nx = (pos.x - 50) / 50;
    const ny = (pos.y - 50) / 50;

    // How far each layer is allowed to slide, as a % of its own box.
    // Background slides less (reads as "far away"), foreground more (reads as "close") → depth.
    const bgShift = 6;
    const fgShift = 14;

    // Desktop: hovering maps the cursor's position straight onto the look-position.
    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
        const { left, top, width, height } = e.currentTarget.getBoundingClientRect();
        const x = ((e.clientX - left) / width) * 100;
        const y = ((e.clientY - top) / height) * 100;
        setPos({ x: clamp(x), y: clamp(y) });
    };

    // Mobile step 1: remember where the finger touched down and the current look-position.
    const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
        const t = e.touches[0];
        dragStart.current = { touchX: t.clientX, touchY: t.clientY, posX: pos.x, posY: pos.y };
    };

    // Mobile step 2: drag-to-pan. Move the look-position by how far the finger has travelled.
    const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
        if (!dragStart.current) return;
        const t = e.touches[0];
        const { width, height } = e.currentTarget.getBoundingClientRect();

        // How far the finger moved since touchdown, as a % of the container.
        const dx = ((t.clientX - dragStart.current.touchX) / width) * 100;
        const dy = ((t.clientY - dragStart.current.touchY) / height) * 100;

        // Subtract so it feels like grabbing the scene: drag finger left → reveal the right side.
        setPos({
            x: clamp(dragStart.current.posX - dx),
            y: clamp(dragStart.current.posY - dy),
        });
    };

    return (
        <div
            onMouseMove={handleMouseMove}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            // touch-none / overscroll-none stop the browser from scrolling or pull-to-refreshing
            // while you drag; select-none stops accidental text/image selection.
            className="w-full h-dvh overflow-hidden relative touch-none overscroll-none select-none"
        >
            {/* Background — z-0, slow shift. The box is bigger than the screen (-inset-[20%])
                so there is always spare image to slide into, on both axes. */}
            <div
                className="absolute inset-[-20%] z-0"
                style={{
                    backgroundImage: "url(/parallax/layer_1.png)",
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                    backgroundRepeat: "no-repeat",
                    // Move opposite to the look-position → classic parallax feel.
                    transform: `translate(${-nx * bgShift}%, ${-ny * bgShift}%)`,
                    willChange: "transform",
                }}
            />
            {/* Foreground — z-10, fast shift (larger fgShift = appears closer). */}
            <div
                className="absolute inset-[-20%] z-10"
                style={{
                    backgroundImage: "url(/parallax/layer_2.png)",
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                    backgroundRepeat: "no-repeat",
                    transform: `translate(${-nx * fgShift}%, ${-ny * fgShift}%)`,
                    willChange: "transform",
                }}
            />
        </div>
    );
}
