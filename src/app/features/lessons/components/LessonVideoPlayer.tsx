"use client"

import { useEffect, useRef, useState } from "react"
import { PauseIcon, PlayIcon } from "lucide-react"

// The lesson video: a plain <video> pointed at a presigned R2 URL.
//
// The controls are the browser's own, and nothing is layered over the picture.
// That is a decision rather than an omission: a tap on a video already brings
// up the native control strip — with play, scrubbing, volume and fullscreen —
// and anything of ours sitting on top intercepts that tap and has to
// reimplement, worse, what it just blocked.
//
// This replaces a component that existed almost entirely to wrangle YouTube's
// IFrame API — a global script loader, a mount-point swap because the API
// replaces the element it is handed, and a teardown race when a lesson was left
// before the player finished building. None of it has an equivalent here.
//
// What it does keep from that component is the teardown itself. See the cleanup
// effect below: a <video> is not silenced by being removed from the page.
export function LessonVideoPlayer({
    src,
    onFinishedVideo,
}: {
    src: string
    // Bound Server Action, absent when this lesson is already complete or the
    // viewer has no business recording progress against it.
    onFinishedVideo?: () => void
}) {
    const [failed, setFailed] = useState(false)
    const [isPaused, setIsPaused] = useState(true)
    const videoRef = useRef<HTMLVideoElement>(null)

    function togglePlayback() {
        const video = videoRef.current
        if (video == null) return

        if (video.paused) {
            // `play()` rejects when the browser declines the gesture — some
            // power-saving modes do. Nothing useful to do about it here, and an
            // unhandled rejection in the console helps no one; the controls are
            // still there to try again.
            video.play().catch(() => {})
        } else {
            video.pause()
        }
    }

    // Stop playing when this leaves the page.
    //
    // Removing a playing <video> from the DOM does not stop it — the element
    // goes on decoding, detached and invisible, and the lesson audio follows
    // you around the site until the file runs out.
    //
    // Pausing is all this does, deliberately. Detaching the source as well
    // (`removeAttribute("src")` + `load()`) releases the buffer sooner, but
    // React's Strict Mode mounts, tears down and remounts every effect in
    // development — and on that fake teardown the source would be stripped for
    // real, while React would not put it back, since from its side the prop
    // never changed. The result is a video with nothing to play. `pause()` is
    // idempotent and survives the same treatment untouched.
    //
    // Keyed on `src` so it runs when the lesson changes too, not only on
    // unmount. The ref is captured into a local because by cleanup time
    // `videoRef.current` is already null.
    useEffect(() => {
        const video = videoRef.current

        return () => {
            video?.pause()
        }
    }, [src])

    // The URL is signed for six hours. A page left open longer than that holds
    // a dead one, and R2 answers an expired presigned URL with a 403 carrying
    // no CORS headers — so nothing here can read *why* it failed. Reloading
    // mints a fresh URL and is the only thing that would help, so that is what
    // the message says rather than guessing at a cause.
    if (failed) {
        return (
            <div className="flex h-full w-full items-center justify-center bg-[#0a1628]/70 p-6 text-center text-base text-ink-meta">
                No se pudo cargar el vídeo. Recarga la página para volver a
                intentarlo.
            </div>
        )
    }

    return (
        <div className="group relative h-full w-full">
            <video
                ref={videoRef}
                // Keyed by src so moving between lessons builds a new element
                // rather than leaving the previous video's playback state attached
                // to the next one.
                key={src}
                src={src}
                controls
                // Takes the download button out of the browser's own controls, and
                // the right-click handler below closes "Save video as…", which is
                // the same download by another door. Fullscreen is deliberately
                // left alone.
                //
                // This removes the invitation, not the capability. The signed URL
                // is still in the network tab and still works for its six hours,
                // and no amount of markup changes that — a determined viewer can
                // fetch it, and screen recording exists regardless. What actually
                // limits the damage is the expiry and the fact that access ends
                // when entitlement does.
                controlsList="nodownload"
                onContextMenu={event => event.preventDefault()}
                preload="metadata"
                // Without this, iOS Safari force-fullscreens every video, which
                // takes the lesson page off screen the moment playback starts.
                // Fullscreen stays available from the controls; it just stops being
                // compulsory.
                playsInline
                // Playback state is read from the element rather than tracked
                // alongside it. The native control strip, the keyboard and the
                // system media keys can all start and stop the video without going
                // through anything of ours, and an icon that says "play" over a
                // playing video is worse than no icon.
                onPlay={() => setIsPaused(false)}
                onPause={() => setIsPaused(true)}
                onEnded={() => {
                    setIsPaused(true)
                    onFinishedVideo?.()
                }}
                onError={() => setFailed(true)}
                // `lesson-video` is the hook for the control-size rules in
                // globals.css. They reach into the browser's shadow DOM through
                // non-standard pseudo-elements, so they are scoped to this one
                // class rather than every <video> on the site.
                className="lesson-video h-full w-full"
            />

            {/* A big target in the middle, and only that — deliberately not a
                full-area overlay. A tap anywhere else lands on the <video> and
                brings up the browser's own control strip, which is how mobile
                playback is meant to work; covering the picture would intercept
                that and leave us reimplementing it.

                Visible while paused, where it is the obvious thing to press.
                While playing it fades out and stops taking pointer events
                entirely, so it can never swallow a tap meant for the video —
                on a desktop it comes back on hover, which is a quicker pause
                than travelling to the control strip.

                In fullscreen it is simply not there. The browser fullscreens
                the <video>, and a sibling of a fullscreen element is not
                rendered — so this needs no fullscreen handling of its own. */}
            <button
                type="button"
                aria-label={isPaused ? "Reanudar el vídeo" : "Pausar el vídeo"}
                aria-hidden={!isPaused}
                tabIndex={isPaused ? 0 : -1}
                onClick={togglePlayback}
                className={`absolute top-1/2 left-1/2 z-10 -translate-x-1/2 -translate-y-1/2 rounded-full bg-black/60 p-5 text-white transition-opacity duration-200 hover:bg-black/75 ${
                    isPaused
                        ? "opacity-100"
                        : "pointer-events-none opacity-0 group-hover:pointer-events-auto group-hover:opacity-100"
                }`}
            >
                {isPaused ? (
                    <PlayIcon className="size-8" />
                ) : (
                    <PauseIcon className="size-8" />
                )}
            </button>
        </div>
    )
}
