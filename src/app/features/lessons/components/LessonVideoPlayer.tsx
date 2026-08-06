"use client"

import { useEffect, useRef, useState } from "react"
import { MaximizeIcon, MinimizeIcon, PauseIcon, PlayIcon } from "lucide-react"

// How long the centre button lingers before fading out again. Long enough to
// aim at, short enough that it is not sitting over the picture for the rest of
// the lesson. Only counted while the video is playing — a paused video keeps
// the button up, since a paused video with no visible way to resume is a
// puzzle rather than an interface.
const CONTROL_VISIBLE_MS = 2500

// The lesson video: a plain <video> pointed at a presigned R2 URL.
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
    const [isFullscreen, setIsFullscreen] = useState(false)
    const [isPaused, setIsPaused] = useState(true)
    const [showControl, setShowControl] = useState(false)
    const videoRef = useRef<HTMLVideoElement>(null)
    const containerRef = useRef<HTMLDivElement>(null)

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

    // The centre button fades itself out again while the video is playing.
    //
    // Not while it is paused: a paused video whose only visible control has
    // just disappeared leaves nothing to press. Depending on `isPaused` also
    // means pausing *through* the button keeps it on screen, which is what you
    // want — the next thing anyone does with it is press it again.
    useEffect(() => {
        if (!showControl || isPaused) return

        const timer = window.setTimeout(
            () => setShowControl(false),
            CONTROL_VISIBLE_MS
        )

        return () => window.clearTimeout(timer)
    }, [showControl, isPaused])

    // Fullscreen is tracked rather than assumed, because it can be left by the
    // Escape key or a system gesture, with no button of ours involved.
    useEffect(() => {
        function handleChange() {
            setIsFullscreen(document.fullscreenElement === containerRef.current)
        }

        document.addEventListener("fullscreenchange", handleChange)
        return () => document.removeEventListener("fullscreenchange", handleChange)
    }, [])

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

    // Fullscreens the container, not the <video>.
    //
    // This is the whole reason the native fullscreen button is turned off. When
    // the video element itself goes fullscreen, it is the only thing on screen
    // — the tap-to-pause overlay is a sibling and simply is not there any more,
    // so a tap does nothing. With the container fullscreen, the overlay goes
    // with it and keeps working.
    //
    // A fullscreen element is laid out at viewport size regardless of its
    // parents, so the lesson frame's aspect ratio stops applying on its own and
    // the video letterboxes inside the screen as you would expect.
    function toggleFullscreen() {
        const container = containerRef.current
        const video = videoRef.current
        if (container == null) return

        if (document.fullscreenElement != null) {
            void document.exitFullscreen().catch(() => {})
            return
        }

        // Safari names everything on this API differently, and iOS supports it
        // on <video> only — never on a container. So the request is tried on
        // the container first and falls back to handing the video itself to
        // whatever fullscreen the platform does have.
        //
        // The fallback costs tap-to-pause, since a fullscreen <video> is the
        // only thing on screen and the overlay goes with the container. That is
        // the platform's boundary rather than a choice: on an iPhone the system
        // player takes over and nothing of ours can sit on top of it.
        const request =
            container.requestFullscreen?.bind(container) ??
            (
                container as HTMLElement & {
                    webkitRequestFullscreen?: () => Promise<void>
                }
            ).webkitRequestFullscreen?.bind(container)

        if (request == null) {
            enterNativeVideoFullscreen(video)
            return
        }

        void Promise.resolve(request()).catch(() => {
            enterNativeVideoFullscreen(video)
        })
    }

    function enterNativeVideoFullscreen(video: HTMLVideoElement | null) {
        if (video == null) return

        const nativeVideo = video as HTMLVideoElement & {
            webkitEnterFullscreen?: () => void
        }

        if (typeof nativeVideo.webkitEnterFullscreen === "function") {
            nativeVideo.webkitEnterFullscreen()
        } else {
            void video.requestFullscreen?.().catch(() => {})
        }
    }

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
        <div ref={containerRef} className="relative h-full w-full bg-black">
            <video
                ref={videoRef}
                // Keyed by src so moving between lessons builds a new element
                // rather than leaving the previous video's playback state
                // attached to the next one.
                key={src}
                src={src}
                controls
                // Takes the download button out of the browser's own controls,
                // and the right-click handler below closes "Save video as…",
                // which is the same download by another door.
                //
                // This removes the invitation, not the capability. The signed
                // URL is still in the network tab and still works for its six
                // hours, and no amount of markup changes that — a determined
                // viewer can fetch it, and screen recording exists regardless.
                // What actually limits the damage is the expiry and the fact
                // that access ends when entitlement does.
                //
                // `nofullscreen` removes the browser's own fullscreen button,
                // which fullscreens the <video> — and a fullscreen <video> is
                // the only thing on screen, so the centre button would not be
                // there to press.
                //
                // Safe to remove now in a way it was not before: the corner
                // button falls back to the platform's own video fullscreen if
                // the container request fails, so there is always a way in.
                controlsList="nodownload nofullscreen"
                onContextMenu={event => event.preventDefault()}
                preload="metadata"
                // Without this, iOS Safari force-fullscreens every video, which
                // takes the lesson page off screen the moment playback starts.
                playsInline
                // Playback state is read from the element rather than tracked
                // alongside it. The native control strip, the keyboard and the
                // system media keys can all start and stop the video without
                // going through anything of ours, and an icon that says "play"
                // over a playing video is worse than no icon.
                onPlay={() => setIsPaused(false)}
                onPause={() => setIsPaused(true)}
                onEnded={() => {
                    setIsPaused(true)
                    onFinishedVideo?.()
                }}
                onError={() => setFailed(true)}
                className="h-full w-full"
            />

            {/* Tapping the picture reveals the centre button; it does not
                pause anything by itself. Two taps to pause rather than one, on
                purpose — a single tap that stops the video makes every stray
                touch while watching an interruption, and on a phone held in one
                hand there are a lot of stray touches.

                It has to be a separate element rather than a handler on the
                <video>, because the browser's own controls live inside that
                element and their clicks surface on it too.

                Stopping short of the bottom leaves the control strip to the
                browser: scrubbing and volume still belong to it. Out of the tab
                order because the centre button below is the real control and is
                reachable on its own. */}
            <button
                type="button"
                aria-label="Mostrar los controles del vídeo"
                tabIndex={-1}
                onClick={() => setShowControl(visible => !visible)}
                className="absolute inset-x-0 top-0 bottom-16 cursor-pointer"
            />

            {/* The control itself. Kept mounted and faded rather than added and
                removed, so it does not appear from nowhere under a finger that
                is already on its way down. */}
            <button
                type="button"
                aria-label={isPaused ? "Reanudar el vídeo" : "Pausar el vídeo"}
                aria-hidden={!showControl}
                tabIndex={showControl ? 0 : -1}
                onClick={togglePlayback}
                className={`absolute top-1/2 left-1/2 z-10 -translate-x-1/2 -translate-y-1/2 rounded-full bg-black/60 p-5 text-white transition-opacity duration-200 hover:bg-black/75 ${
                    showControl ? "opacity-100" : "pointer-events-none opacity-0"
                }`}
            >
                {isPaused ? (
                    <PlayIcon className="size-8" />
                ) : (
                    <PauseIcon className="size-8" />
                )}
            </button>

            <button
                type="button"
                aria-label={
                    isFullscreen ? "Salir de pantalla completa" : "Pantalla completa"
                }
                onClick={toggleFullscreen}
                // Above the tap overlay explicitly. Both are absolutely
                // positioned siblings, so paint order alone would put this on
                // top — but "alone" is doing a lot of work in that sentence,
                // and a fullscreen button that silently pauses the video
                // instead is not a failure worth risking on source ordering.
                className="absolute top-2 right-2 z-10 rounded-md bg-black/50 p-2 text-white/90 transition-colors hover:bg-black/70 hover:text-white"
            >
                {isFullscreen ? (
                    <MinimizeIcon className="size-5" />
                ) : (
                    <MaximizeIcon className="size-5" />
                )}
            </button>
        </div>
    )
}
