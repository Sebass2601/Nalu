"use client";

import { useState } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight, LoaderCircle } from "lucide-react";
import { galleryNeighbourIndexes } from "./galleryNeighbours";

export type GalleryImage = {
    id: string;
    url: string;
    caption: string | null;
};

// Every image is drawn at the same size, quality and breakpoints,
// and that has to stay true of the invisible copies used to fetch ahead as well
// as the one on screen. The browser picks which entry of `srcSet` to download
// from `sizes`, not from how big the element happens to be, so a hidden image
// carrying these same values asks for the very same URL the visible one will
// ask for a moment later — which is the whole point, since a fetch of a
// different width would warm nothing.
const IMAGE_SIZES = "(max-width: 768px) 100vw, 40vw";
const IMAGE_WIDTH = 1200;
const IMAGE_HEIGHT = 900;

// The picture that sits inside a piece of writing — a text lesson or an
// announcement — with its own caption underneath and arrows to move between
// pictures when there is more than one.
//
// A client component only because of the arrows: which image is showing is
// browser state and nothing else on the page depends on it. A single image never
// changes what it shows, but it renders through here anyway so the frame, the
// sizing and the caption are defined once instead of twice.
//
// It floats left on wide screens so the text wraps around it, and drops to a
// full-width block on narrow ones — a floated image in a column that narrow
// leaves text in unreadable slivers beside it.
export function ImageGallery({ images }: { images: GalleryImage[] }) {
    const [index, setIndex] = useState(0);
    // Which images have arrived and been decoded, held by URL rather than by
    // position. An image the reader has already been shown stays marked when
    // they come back round to it, so the spinner appears once per image at
    // most and never on a second pass through the gallery.
    const [loaded, setLoaded] = useState<ReadonlySet<string>>(new Set());

    if (images.length === 0) return null;

    // Wrapping with the remainder rather than clamping at the ends, so the
    // arrows never present themselves as available and then do nothing — and
    // so the last image is one step from the first however long the gallery
    // gets.
    const total = images.length;
    const image = images[index];

    // Stepping from the previous value rather than from the `index` this render
    // closed over. Two clicks landing in one batch both read the same stale
    // `index` otherwise, and the second one silently undoes the first — an
    // impatient double-tap on the arrow moving the gallery one image, or none.
    const go = (step: number) =>
        setIndex(current => (current + step + total) % total);

    const markLoaded = (url: string) =>
        setLoaded(current => new Set(current).add(url));

    // The picture on screen is the previous one until the new bytes arrive: a
    // browser handed a new address on an existing image goes on painting what
    // it already has, and there is no placeholder underneath to give it away.
    // Without this flag a click looks like it did nothing at all.
    const isLoading = !loaded.has(image.url);

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
                <div className="relative overflow-hidden rounded-xl border border-gold/40 bg-[#0a1628]/70">
                    <Image
                        src={image.url}
                        alt={image.caption ?? ""}
                        width={IMAGE_WIDTH}
                        height={IMAGE_HEIGHT}
                        className={`block h-auto w-full transition-opacity duration-200 ${
                            isLoading ? "opacity-40" : "opacity-100"
                        }`}
                        sizes={IMAGE_SIZES}
                        onLoad={() => markLoaded(image.url)}
                    />

                    {/* Fading the stale picture back and turning a ring over it
                        is the honest reading of the state: something is coming,
                        what you are looking at is not it yet. Dimming rather
                        than blanking keeps the frame the size it already is, so
                        the lesson text wrapped around the figure does not
                        reflow on every step through the gallery. */}
                    {isLoading && (
                        <div className="absolute inset-0 flex items-center justify-center">
                            <LoaderCircle className="size-8 animate-spin text-gold/80" />
                        </div>
                    )}
                </div>

                {/* The next image and the previous one, fetched now and drawn
                    nowhere. This is what makes the arrows feel immediate: by the
                    time the reader clicks, the picture is already in the
                    browser's cache and swapping to it costs nothing.

                    Invisible by way of a transparent one-pixel box rather than
                    `display:none`, which browsers are entitled to treat as a
                    reason not to bother fetching at all, and `eager` because the
                    default is to defer anything this far out of view — the two
                    settings that would each, on their own, quietly turn this
                    into no preloading whatsoever.

                    They report their own arrival too, so an image fetched ahead
                    is already marked by the time it is asked for and shows no
                    spinner at all. */}
                {galleryNeighbourIndexes(index, total).map(neighbourIndex => {
                    const neighbour = images[neighbourIndex];

                    return (
                        <Image
                            key={neighbour.id}
                            src={neighbour.url}
                            alt=""
                            aria-hidden
                            width={IMAGE_WIDTH}
                            height={IMAGE_HEIGHT}
                            sizes={IMAGE_SIZES}
                            loading="eager"
                            className="pointer-events-none absolute size-px opacity-0"
                            onLoad={() => markLoaded(neighbour.url)}
                        />
                    );
                })}

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
                <figcaption className="mt-2 text-center text-sm text-ink-body">
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
                                    ? "bg-gold"
                                    : "bg-gold/30 hover:bg-gold/60"
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
            className={`absolute top-1/2 -translate-y-1/2 cursor-pointer rounded-full border border-gold/50 bg-[#0a1628]/80 p-1.5 text-gold backdrop-blur-sm transition-colors hover:bg-gold hover:text-[#0a1628] ${
                isPrevious ? "left-2" : "right-2"
            }`}
        >
            <Icon className="size-4" />
        </button>
    );
}
