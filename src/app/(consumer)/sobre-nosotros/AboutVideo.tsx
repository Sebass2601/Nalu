"use client";

import { useEffect, useRef } from "react";

import { bevelFace, bevelOutline, Diamond } from "@/components/ui/plaque";

// The plaque, at the size a video can carry. 14px of corner sits between the
// navbar tile's 8 and the category doorway's larger cut: the frame is a big
// object, and a small slice on a big rectangle reads as a rounded corner that
// did not quite commit.
const CUT = 14;
const FACE = bevelFace(CUT);
const RULE = bevelOutline({ cut: CUT, inset: 0, width: 2 });
const HAIRLINE = bevelOutline({ cut: CUT, inset: 5, width: 1 });

// How much of the viewport's height the tallest video may claim. The portrait
// one is 9:16, so without a ceiling it stands over 1000px tall on a laptop and
// its own controls end up below the fold.
const MAX_VIEWPORT_HEIGHT = 70;

// A video set into the page's own plaque: the bevelled navy face, the gold rule
// with its inner hairline, and a diamond pinned above and below. The same object
// the navbar draws around the section you are in, which is why it is imported
// from `plaque` rather than drawn again here.
//
// The frame is drawn AROUND the picture rather than clipped onto it, and that is
// load-bearing rather than stylistic. `clip-path` applied to a <video> also
// clips the native control strip, which lives in the element's shadow DOM — a
// 14px corner would slice the ends off the play and scrub controls. Insetting
// the picture inside the plaque keeps the controls a full rectangle and, as a
// bonus, reads like a picture in a mount rather than a video with its corners
// shaved.
//
// The controls themselves are the browser's own, exactly as in
// `LessonVideoPlayer` — see the reasoning there, which applies unchanged: a tap
// on a video already raises the native strip, and anything of ours laid over the
// picture intercepts that tap and has to reimplement, worse, what it just
// blocked.
//
// Deliberately not sharing that component. It carries `onFinishedVideo` for
// recording lesson progress and a failure message about presigned R2 URLs
// expiring, and neither means anything for a static file in `public/`. Six
// repeated attributes are cheaper to read than three props that only ever take
// one value.
export function AboutVideo({
    src,
    width,
    height,
    label,
    className = "",
}: {
    src: string;
    // The file's real pixel dimensions. Kept as explicit numbers rather than
    // measured at runtime for two reasons: the box has to have its shape before
    // the browser has loaded any metadata, or the page jumps when it arrives —
    // and replacing this video with a better export later, which will almost
    // certainly be larger than these 576px sources, is then a two-number edit
    // with nothing else in the layout to chase.
    width: number;
    height: number;
    // What the video is about, for anyone who cannot see it. There is no visible
    // caption: the surrounding prose already introduces both of these.
    label: string;
    className?: string;
}) {
    const videoRef = useRef<HTMLVideoElement>(null);

    // Stop playing when this leaves the page.
    //
    // The same guard `LessonVideoPlayer` documents, and needed here for the same
    // reason: navigating away in the App Router unmounts the component without
    // reloading the document, and a <video> removed from the DOM goes on
    // decoding, detached and invisible, with its audio following the visitor
    // around the site. Both of these have sound, so it would be heard.
    //
    // Pausing only — detaching the source as well would be undone by Strict
    // Mode's development remount, which tears an effect down and builds it back
    // while React, seeing no prop change, never restores the src.
    useEffect(() => {
        const video = videoRef.current;

        return () => {
            video?.pause();
        };
    }, [src]);

    return (
        <div
            className={`relative mx-auto w-full ${className}`}
            style={{
                // Capped at the file's own width so it is never enlarged —
                // these sources are 576px wide and blow up soft — and capped
                // again against the viewport so the portrait one cannot run
                // past the fold.
                //
                // The height is limited by limiting the WIDTH, which reads
                // backwards and is the only thing that works: with an aspect
                // ratio set, the width drives the height, so a `max-height`
                // afterwards would leave a box that no longer matches the ratio
                // and letterbox the picture inside its own frame. This is the
                // same manoeuvre `LessonBody` makes for the lesson video.
                maxWidth: `min(${width}px, calc(${MAX_VIEWPORT_HEIGHT}vh * ${width} / ${height}))`,
            }}
        >
            {/* The face. `p-2` is the mount: it is what holds the picture off
                the gold rule so the two are not touching. */}
            <div
                className="bg-[#0a1628]/80 p-2 backdrop-blur-md"
                style={{ clipPath: FACE }}
            >
                <video
                    ref={videoRef}
                    // `#t=0.1` is a media fragment — "start at 0.1 seconds".
                    // Browsers honour it by seeking there while loading metadata
                    // and painting that frame, which gives a real still instead
                    // of a black rectangle with a play button on it. A poster
                    // without a poster file: nothing to export, store or keep in
                    // step with the video.
                    //
                    // A tenth of a second rather than 0, because the opening
                    // frame of an H.264 file is often a black lead-in and
                    // seeking to exactly 0 is the case browsers agree on least.
                    //
                    // It depends on `preload="metadata"` below — at
                    // `preload="none"` nothing is fetched and there is no frame
                    // to paint.
                    src={`${src}#t=0.1`}
                    controls
                    // Takes the download item out of the native menu, and the
                    // context-menu handler closes "Save video as…", the same
                    // download by another door. Neither is a lock: the file is
                    // a plain public URL and always will be. It removes the
                    // invitation, nothing more.
                    controlsList="nodownload"
                    onContextMenu={event => event.preventDefault()}
                    // Nothing is fetched until it is played, beyond the header
                    // needed for the still above. It is what keeps two videos
                    // near the top of the page from costing every visitor 16MB
                    // before they have read a line.
                    preload="metadata"
                    // Without this iOS Safari force-fullscreens on play, which
                    // takes the page off screen. Fullscreen stays available from
                    // the controls; it stops being compulsory.
                    playsInline
                    aria-label={label}
                    // Set on the element as well as on the wrapper, so the box
                    // keeps its shape from first paint rather than from whenever
                    // metadata arrives.
                    style={{ aspectRatio: `${width} / ${height}` }}
                    className="block h-auto w-full"
                />
            </div>

            {/* The gold, over the face so the glass beneath stays see-through.
                Two lines rather than one — the 2px rule on the edge and a
                fainter hairline inside it — which is the full plaque the navbar
                reserves for the section you are in. */}
            <span
                aria-hidden
                className="pointer-events-none absolute inset-0 bg-gold"
                style={{ clipPath: RULE }}
            />
            <span
                aria-hidden
                className="pointer-events-none absolute inset-0 bg-gold opacity-40"
                style={{ clipPath: HAIRLINE }}
            />

            {/* The site's diamond, pinning the frame top and bottom exactly as
                it pins every plaque. `gold` rather than `navy`: these sit half
                on the frame and half on the page, and both are dark here. */}
            <Diamond className="top-0 -translate-y-1/2" />
            <Diamond className="bottom-0 translate-y-1/2" />
        </div>
    );
}
