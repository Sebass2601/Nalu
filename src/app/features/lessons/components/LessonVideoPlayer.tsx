"use client"

import { useRef, useState } from "react"

// The lesson video: a plain <video> pointed at a presigned R2 URL.
//
// This replaces a component that existed almost entirely to wrangle YouTube's
// IFrame API — a global script loader, a mount-point swap because the API
// replaces the element it is handed, and a teardown race when a lesson was left
// before the player finished building. None of it has an equivalent here, which
// is the point: the browser already knows how to play a video.
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
        <div className="relative h-full w-full">
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
                controlsList="nodownload"
                onContextMenu={event => event.preventDefault()}
                preload="metadata"
                // Without this, iOS Safari force-fullscreens every video, which
                // takes the lesson page off screen the moment playback starts.
                playsInline
                onEnded={() => onFinishedVideo?.()}
                onError={() => setFailed(true)}
                className="h-full w-full"
            />

            {/* Tap anywhere on the picture to pause or resume, the way every
                video app behaves on a phone.

                It has to be a separate element rather than a click handler on
                the <video>, because the browser's own controls live inside that
                element and their clicks surface on it too — tapping the play
                button would start playback and then this would immediately
                stop it again.

                Stopping short of the bottom leaves the control strip to the
                browser: scrubbing, volume and fullscreen all still belong to
                it. Out of the tab order because the native controls are already
                keyboard-reachable and a second, invisible stop would only be
                confusing. */}
            <button
                type="button"
                aria-label="Pausar o reanudar el vídeo"
                tabIndex={-1}
                onClick={togglePlayback}
                className="absolute inset-x-0 top-0 bottom-16 cursor-pointer"
            />
        </div>
    )
}
