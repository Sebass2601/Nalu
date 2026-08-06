"use client"

import { useRef, useState } from "react"
import { toast } from "sonner"
import { CheckIcon, Loader2Icon, VideoIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
    requestLessonVideoUpload,
    saveLessonVideo,
} from "../actions/lessonVideo"

// The lesson video picker. Shaped after `ImageUploadField`, but the file goes
// straight to R2 rather than through UploadThing: video is too large for a
// server route, and R2 is the only place a private object can land.
//
// Duration is read here, in the browser, from a throwaway <video>. Reading it on
// the server would mean the server handling the bytes — exactly what uploading
// against a presigned URL exists to avoid.
export function VideoUploadField({
    lessonId,
    value,
    onChange,
    disabled = false,
}: {
    // The object key is namespaced under the lesson, so a lesson with no id yet
    // has nowhere to put a file. A new lesson has to be saved first.
    lessonId: string | null
    value: string | null | undefined
    onChange: (value: string | null) => void
    disabled?: boolean
}) {
    const inputRef = useRef<HTMLInputElement>(null)
    const [isUploading, setIsUploading] = useState(false)

    // Duration and dimensions both come from the same metadata load, so they
    // are read together. The dimensions are what let the lesson page shape its
    // frame to the picture rather than assuming every video is 9:16.
    async function readVideoMetadata(file: File) {
        const url = URL.createObjectURL(file)

        try {
            return await new Promise<{
                durationSeconds: number
                width: number
                height: number
            }>((resolve, reject) => {
                const probe = document.createElement("video")
                probe.preload = "metadata"
                probe.onloadedmetadata = () =>
                    resolve({
                        durationSeconds: Math.round(probe.duration),
                        width: probe.videoWidth,
                        height: probe.videoHeight,
                    })
                probe.onerror = () => reject(new Error("No se pudo leer el vídeo"))
                probe.src = url
            })
        } finally {
            URL.revokeObjectURL(url)
        }
    }

    async function upload(file: File) {
        if (lessonId == null) {
            toast.error("Guarda la lección antes de subir el vídeo")
            return
        }

        if (file.type !== "video/mp4") {
            toast.error("El vídeo debe ser un MP4")
            return
        }

        setIsUploading(true)

        try {
            const metadata = await readVideoMetadata(file)

            const requested = await requestLessonVideoUpload({
                lessonId,
                contentType: "video/mp4",
            })

            if (requested.error) {
                toast.error(requested.message)
                return
            }

            // Content-Type has to match what the URL was signed for, or R2
            // rejects the PUT with a signature mismatch. A CORS error here
            // instead means the bucket policy is missing this origin.
            const response = await fetch(requested.uploadUrl, {
                method: "PUT",
                body: file,
                headers: { "Content-Type": file.type },
            })

            if (!response.ok) {
                toast.error("Falló la subida del vídeo")
                return
            }

            const saved = await saveLessonVideo({
                lessonId,
                key: requested.key,
                durationSeconds: metadata.durationSeconds,
                width: metadata.width,
                height: metadata.height,
            })

            if (saved.error) {
                toast.error(saved.message)
                return
            }

            // The key is written to the lesson by `saveLessonVideo` and mirrored
            // into the form so validation sees a video is present without
            // needing the page reloaded.
            onChange(requested.key)
            toast.success("Vídeo subido")
        } catch {
            toast.error("Falló la subida del vídeo")
        } finally {
            setIsUploading(false)
        }
    }

    return (
        <div className="flex items-center gap-3">
            {/* A 9:16 sliver rather than a square: the shape is the one thing
                worth showing when there is no thumbnail to show. */}
            <div className="flex h-16 w-9 items-center justify-center rounded border border-dashed text-muted-foreground">
                {value ? (
                    <CheckIcon className="size-5 text-foreground" />
                ) : (
                    <VideoIcon className="size-5" />
                )}
            </div>
            <input
                ref={inputRef}
                type="file"
                accept="video/mp4"
                hidden
                onChange={event => {
                    const file = event.target.files?.[0]
                    if (file != null) void upload(file)
                    // Cleared so picking the same file twice in a row still
                    // fires a change event.
                    event.target.value = ""
                }}
            />
            <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={disabled || isUploading || lessonId == null}
                onClick={() => inputRef.current?.click()}
            >
                {isUploading ? (
                    <>
                        <Loader2Icon className="size-4 animate-spin" />
                        Subiendo...
                    </>
                ) : value ? (
                    "Cambiar vídeo"
                ) : (
                    "Subir vídeo"
                )}
            </Button>
            {lessonId == null && (
                <p className="text-sm text-muted-foreground">
                    Guarda la lección primero para poder subir el vídeo.
                </p>
            )}
        </div>
    )
}
