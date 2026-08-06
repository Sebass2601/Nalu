"use client"

import { useState } from "react"

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
        <video
            // Keyed by src so moving between lessons builds a new element
            // rather than leaving the previous video's playback state attached
            // to the next one.
            key={src}
            src={src}
            controls
            preload="metadata"
            // Without this, iOS Safari force-fullscreens every video, which
            // takes the lesson page off screen the moment playback starts.
            playsInline
            onEnded={() => onFinishedVideo?.()}
            onError={() => setFailed(true)}
            className="h-full w-full"
        />
    )
}
