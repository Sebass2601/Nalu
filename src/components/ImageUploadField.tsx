"use client"

import { useRef } from "react"
import { toast } from "sonner"
import { ImageIcon, Loader2Icon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useUploadThing } from "@/lib/uploadthing"
import type { AppFileRouter } from "@/app/api/uploadthing/core"

// The image picker shared by the product and course forms: a preview, a hidden
// file input, and a button to drive it.
//
// The browser uploads straight to UploadThing and this component hands the
// resulting URL back through `onChange` — so as far as the form is concerned
// the value is only ever a string (or null, once cleared). Nothing here knows
// what the URL is eventually stored on.
//
// `endpoint` is keyed to the file router, so the caller can only name a route
// that actually exists, and each route brings its own permission check.
export function ImageUploadField({
    endpoint,
    value,
    onChange,
    clearable = false,
    disabled = false,
}: {
    endpoint: keyof AppFileRouter
    value: string | null | undefined
    onChange: (value: string | null) => void
    // Whether the image can be taken away again. Only true where the column
    // behind it is nullable — a product must always have a picture, a course
    // need not.
    clearable?: boolean
    disabled?: boolean
}) {
    const inputRef = useRef<HTMLInputElement>(null)
    const { startUpload, isUploading } = useUploadThing(endpoint, {
        onClientUploadComplete: files => {
            const url = files[0]?.ufsUrl
            if (url != null) onChange(url)
        },
        onUploadError: error => {
            toast.error(error.message)
        },
    })

    return (
        <div className="flex items-center gap-3">
            {value ? (
                // Plain <img> rather than next/image: this is a 64px admin
                // preview of a URL that changes as you upload, so the optimizer
                // buys nothing and only adds a round trip before the picture
                // you just chose appears.
                <img
                    src={value}
                    alt=""
                    className="size-16 rounded border object-cover"
                />
            ) : (
                <div className="flex size-16 items-center justify-center rounded border border-dashed text-muted-foreground">
                    <ImageIcon className="size-5" />
                </div>
            )}
            <input
                ref={inputRef}
                type="file"
                accept="image/*"
                hidden
                onChange={event => {
                    const file = event.target.files?.[0]
                    if (file != null) startUpload([file])
                    // Cleared so picking the same file twice in a row still
                    // fires a change event.
                    event.target.value = ""
                }}
            />
            <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={disabled || isUploading}
                onClick={() => inputRef.current?.click()}
            >
                {isUploading ? (
                    <>
                        <Loader2Icon className="size-4 animate-spin" />
                        Subiendo...
                    </>
                ) : value ? (
                    "Cambiar imagen"
                ) : (
                    "Subir imagen"
                )}
            </Button>
            {clearable && value && !isUploading && (
                <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={disabled}
                    onClick={() => onChange(null)}
                >
                    Quitar imagen
                </Button>
            )}
        </div>
    )
}
