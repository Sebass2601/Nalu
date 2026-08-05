"use client"

import { useRef } from "react"
import { toast } from "sonner"
import { Loader2Icon, UserIcon } from "lucide-react"
import { useUploadThing } from "@/lib/uploadthing"

// The avatar picker on /profile.
//
// A sibling of `ImageUploadField` rather than a variant of it: that one is a
// square thumbnail with light-theme shadcn buttons, built for the admin forms
// on their white surface. This is a round face in a gold ring on navy, and the
// two share only the upload call — bending one component to cover both would
// mean a `shape` prop and a `theme` prop deciding almost every class it emits.
//
// The browser uploads straight to UploadThing and this hands the resulting URL
// up through `onChange`; the form below stores it in a hidden input and the
// Server Action writes it to the user's `image` column on submit. Nothing is
// saved until the form is.
export function ProfileAvatarField({
    value,
    onChange,
    disabled = false,
}: {
    value: string | null
    onChange: (value: string | null) => void
    disabled?: boolean
}) {
    const inputRef = useRef<HTMLInputElement>(null)
    const { startUpload, isUploading } = useUploadThing("profileImage", {
        onClientUploadComplete: files => {
            const url = files[0]?.ufsUrl
            if (url != null) onChange(url)
        },
        onUploadError: error => {
            toast.error(error.message)
        },
    })

    return (
        <div className="flex items-center gap-5">
            <span className="relative block size-24 shrink-0 overflow-hidden rounded-full bg-[#0a1628] ring-2 ring-gold">
                {value ? (
                    // Plain <img>, as in the admin picker: the URL changes the
                    // moment an upload finishes, and routing a just-uploaded
                    // file through the optimizer only delays the preview of the
                    // picture you are looking at.
                    <img
                        src={value}
                        alt=""
                        className="size-full object-cover"
                    />
                ) : (
                    <UserIcon
                        aria-hidden
                        className="absolute inset-0 m-auto size-10 text-gold"
                    />
                )}

                {isUploading && (
                    <span className="absolute inset-0 flex items-center justify-center bg-[#0a1628]/70">
                        <Loader2Icon className="size-6 animate-spin text-gold" />
                    </span>
                )}
            </span>

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

            <div className="flex flex-col items-start gap-2">
                <button
                    type="button"
                    disabled={disabled || isUploading}
                    onClick={() => inputRef.current?.click()}
                    className="cursor-pointer rounded-md border border-gold/40 px-3 py-1.5 text-xs tracking-widest text-ink-bright transition-colors hover:border-gold hover:bg-gold/10 disabled:cursor-not-allowed disabled:opacity-50"
                >
                    {isUploading
                        ? "Subiendo..."
                        : value
                          ? "Cambiar foto"
                          : "Subir foto"}
                </button>

                {value && !isUploading && (
                    <button
                        type="button"
                        disabled={disabled}
                        onClick={() => onChange(null)}
                        className="cursor-pointer text-xs tracking-widest text-ink-meta underline transition-colors hover:text-ink-body disabled:opacity-50"
                    >
                        Quitar foto
                    </button>
                )}
            </div>
        </div>
    )
}
