"use client";

import { useState } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight } from "lucide-react";

export type LessonImage = {
    id: string;
    url: string;
    caption: string | null;
};

// The picture that sits inside a lesson's text, with its own caption underneath
// and arrows to move between pictures when there is more than one.
//
// A client component only because of the arrows: which image is showing is
// browser state and nothing else on the page depends on it. A lesson with a
// single image never changes what it shows, but it renders through here anyway
// so the frame, the sizing and the caption are defined once instead of twice.
//
// It floats left on wide screens so the lesson text wraps around it, and drops
// to a full-width block on narrow ones — a floated image in a column that
// narrow leaves text in unreadable slivers beside it.
export function LessonGallery({ images }: { images: LessonImage[] }) {
    const [index, setIndex] = useState(0);

    if (images.length === 0) return null;

    // Wrapping with the remainder rather than clamping at the ends, so the
    // arrows never present themselves as available and then do nothing — and
    // so the last image is one step from the first however long the gallery
    // gets.
    const total = images.length;
    const image = images[index];
    const go = (step: number) => setIndex((index + step + total) % total);

    return (
        <figure className="mb-4 w-full md:float-left md:mr-6 md:w-2/5">
            <div className="relative">
                {/* The frame takes its shape from the picture instead of the
                    other way round. There is no fixed ratio and no `fill` here:
                    the image is a normal block at the full width of the figure
                    with its height left to `auto`, so it keeps its own
                    proportions and the bordered box, having nothing else in it,
                    ends up exactly the same shape. A square illustration gets a
                    square frame, a tall one a tall frame, and neither is
                    cropped or padded out with empty margins to reach a shape it
                    never had.

                    `block` matters: an inline image sits on the text baseline
                    and leaves a few pixels of descender gap beneath it, which
                    would show up as precisely the sliver of dead space this is
                    meant to remove.

                    `width`/`height` are required for a remote src and are only
                    a ratio — Next.js reserves space with them until the real
                    image arrives, after which the natural proportions win. 4:3
                    keeps that reservation close to the old layout. */}
                <div className="relative overflow-hidden rounded-xl border border-yellow-200/40 bg-[#0a1628]/70">
                    <Image
                        src={image.url}
                        alt={image.caption ?? ""}
                        width={1200}
                        height={900}
                        className="block h-auto w-full"
                        sizes="(max-width: 768px) 100vw, 40vw"
                    />
                </div>

                {total > 1 && (
                    <>
                        <GalleryArrow
                            direction="previous"
                            onClick={() => go(-1)}
                        />
                        <GalleryArrow direction="next" onClick={() => go(1)} />
                    </>
                )}
            </div>

            {/* Each image carries its own caption, so it lives with the image
                rather than under the whole gallery — and the space collapses
                entirely for images that have none. */}
            {image.caption && (
                <figcaption className="mt-2 text-center text-sm text-gold-body">
                    {image.caption}
                </figcaption>
            )}

            {total > 1 && (
                // `flex-wrap` because the number of dots is the number of
                // images, which is now unbounded — a long gallery spills onto a
                // second row instead of pushing the figure wider than its
                // column.
                <div className="mt-2 flex flex-wrap justify-center gap-1.5">
                    {images.map((dot, dotIndex) => (
                        <button
                            key={dot.id}
                            type="button"
                            onClick={() => setIndex(dotIndex)}
                            aria-label={`Imagen ${dotIndex + 1} de ${total}`}
                            aria-current={dotIndex === index}
                            className={`size-1.5 cursor-pointer rounded-full transition-colors ${
                                dotIndex === index
                                    ? "bg-yellow-200"
                                    : "bg-yellow-200/30 hover:bg-yellow-200/60"
                            }`}
                        />
                    ))}
                </div>
            )}
        </figure>
    );
}

// One of the two overlaid arrows. Sitting on top of the image rather than beside
// it keeps the figure the same width whether or not there is anything to switch
// between, so a one-image lesson and a twenty-image one lay out identically.
function GalleryArrow({
    direction,
    onClick,
}: {
    direction: "previous" | "next";
    onClick: () => void;
}) {
    const isPrevious = direction === "previous";
    const Icon = isPrevious ? ChevronLeft : ChevronRight;

    return (
        <button
            type="button"
            onClick={onClick}
            aria-label={isPrevious ? "Imagen anterior" : "Imagen siguiente"}
            className={`absolute top-1/2 -translate-y-1/2 cursor-pointer rounded-full border border-yellow-200/50 bg-[#0a1628]/80 p-1.5 text-gold backdrop-blur-sm transition-colors hover:bg-yellow-200 hover:text-[#0a1628] ${
                isPrevious ? "left-2" : "right-2"
            }`}
        >
            <Icon className="size-4" />
        </button>
    );
}
