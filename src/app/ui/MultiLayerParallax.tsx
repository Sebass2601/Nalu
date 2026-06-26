'use client'

import { RecordWithTtl } from "dns";
import React, { useState } from "react";

export default function MultiLayerParallax() {
    // Default to center so images aren't offset before first mouse interaction
    const [mousePos, setMousePos] = useState({ x:50, y:50 })

    // Lower multiplier = slower movement = perceived greater distance
    const bgX = 50 + (mousePos.x - 50) * 0.3;
    const fgX = 50 + (mousePos.x - 50) * 0.7;

    const bgY = 50 + (mousePos.y - 50) * 0.3;
    const fgY = 50 + (mousePos.y - 50) * 0.7;

    // Normalizes cursor position to 0–100% relative to the container
    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
        const { left, top, width, height } = e.currentTarget.getBoundingClientRect();
        const x = (e.clientX - left) / width * 100;
        const y = (e.clientY - top) / height * 100;
        setMousePos({ x, y })
    };

    // Same movement feature as handleMouseMove but for mobile touchscreen
    const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
        e.preventDefault();
        const touch = e.touches[0];
        const { left, top, width, height } = e.currentTarget.getBoundingClientRect();
        const x = (100 - touch.clientX - left) / width * 100;
        const y = (100 - touch.clientY - top) / height * 100;
        setMousePos({ x, y })
    };


    return (
        <div
        onMouseMove={handleMouseMove}
        onTouchMove={handleTouchMove}
        className="w-full h-dvh overflow-hidden relative grid place-items-center"
        >
            {/* Background — z-0, slow shift */}
            <div
                className="absolute inset-0 z-0"
                style={{
                    backgroundImage: "url(/parallax/layer_1.png)",
                    backgroundPosition: `${bgX}% ${bgY}%`,
                    backgroundSize: "cover",
                    backgroundRepeat: "no-repeat",

                }}
            />
            {/* Foreground — z-10, fast shift */}
            <div
                className="absolute inset-0 z-10"
                style={{
                    backgroundImage: "url(/parallax/layer_2.png)",
                    backgroundPosition: `${fgX}% ${fgY}%`,
                    backgroundSize: "cover",
                    backgroundRepeat: "no-repeat",

                }}
            />
        </div>
    );
}
