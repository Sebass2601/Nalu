"use client"

import { useEffect, useRef } from "react"

// The lesson video, driven by YouTube's IFrame Player API directly.
//
// This used to be `react-youtube`, which crashed with "Cannot read properties
// of null (reading 'playVideo')" whenever the player was taken off screen while
// it was still starting up — Strict Mode's remount in development, or simply
// moving to the next lesson before the video finished loading. That library
// tears the player down and builds it back up from two different places, and
// the rebuild ran after React had already let go of the element, so it handed
// YouTube a `null` container.
//
// Creating and destroying the player in the same effect is what makes that
// impossible: whatever tears the component down runs the cleanup, and the
// cleanup is the only thing that can undo what the effect did.
export function YouTubeVideoPlayer({
  videoId,
  onFinishedVideo,
}: {
  videoId: string
  onFinishedVideo?: () => void
}) {
  const containerRef = useRef<HTMLDivElement>(null)

  // Read through a ref rather than depended on directly. `onFinishedVideo` is a
  // bound Server Action, so it is a new function on every render of the page —
  // depending on it would rebuild the player mid-video.
  const onFinishedVideoRef = useRef(onFinishedVideo)
  useEffect(() => {
    onFinishedVideoRef.current = onFinishedVideo
  }, [onFinishedVideo])

  useEffect(() => {
    const container = containerRef.current
    if (container == null) return

    // The API *replaces* the element it is given with the <iframe>. Giving it a
    // node React rendered would leave React updating a node that is no longer
    // in the page, so it gets a throwaway child of ours to replace instead.
    const mountPoint = document.createElement("div")
    container.append(mountPoint)

    let player: YouTubePlayerInstance | null = null
    let cancelled = false

    void loadIframeApi().then(YT => {
      // The script can finish loading long after the lesson was left. Building
      // a player at that point would be building it into a detached element.
      if (cancelled) return

      player = new YT.Player(mountPoint, {
        width: "100%",
        height: "100%",
        videoId,
        events: {
          onStateChange: event => {
            if (event.data === YT.PlayerState.ENDED) {
              onFinishedVideoRef.current?.()
            }
          },
        },
      })
    })

    return () => {
      cancelled = true
      player?.destroy()
      // `destroy` removes the iframe, but it never ran if the player was still
      // being built. Emptying the container covers both cases, so nothing is
      // left behind for a second mount to find.
      container.replaceChildren()
    }
  }, [videoId])

  // The iframe carries width/height of "100%", but sizing it here too means the
  // box is right even in the moment before the API has replaced the mount point.
  return (
    <div
      ref={containerRef}
      className="h-full w-full [&>iframe]:h-full [&>iframe]:w-full"
    />
  )
}

// One script for the whole page, however many players ask for it. YouTube's
// loader announces itself by calling a global, so the promise is what turns
// "whoever gets there first starts the download" into "everyone else waits".
let iframeApi: Promise<YouTubeApi> | undefined

function loadIframeApi() {
  if (iframeApi != null) return iframeApi

  iframeApi = new Promise<YouTubeApi>(resolve => {
    if (window.YT?.Player != null) return resolve(window.YT)

    // Chained rather than overwritten: the script calls this exactly once, and
    // anything else on the page that set it is entitled to its turn.
    const previousCallback = window.onYouTubeIframeAPIReady
    window.onYouTubeIframeAPIReady = () => {
      previousCallback?.()
      resolve(window.YT as YouTubeApi)
    }

    const script = document.createElement("script")
    script.src = "https://www.youtube.com/iframe_api"
    document.head.append(script)
  })

  return iframeApi
}

// Only the corner of the API this component touches. The full typings live in
// `@types/youtube`, which is a lot of surface for one player and one event.
type YouTubePlayerInstance = {
  destroy(): void
}

type YouTubeApi = {
  Player: new (
    element: HTMLElement,
    options: {
      width?: string | number
      height?: string | number
      videoId?: string
      events?: {
        onStateChange?: (event: { data: number }) => void
      }
    }
  ) => YouTubePlayerInstance
  PlayerState: { ENDED: number }
}

declare global {
  interface Window {
    YT?: YouTubeApi
    onYouTubeIframeAPIReady?: () => void
  }
}
