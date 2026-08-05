"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
    ImagePlusIcon,
    Loader2Icon,
    SaveIcon,
    Trash2Icon,
} from "lucide-react";
import { SortableItem, SortableList } from "@/components/SortableList";
import { ActionButton } from "@/components/ActionButton";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { actionToast } from "@/lib/actionToast";
import { formatPlural } from "@/lib/formatters";
import { cn } from "@/lib/utils";
import { useUploadThing } from "@/lib/uploadthing";
import {
    addLessonImages,
    deleteLessonImage,
    updateLessonImageCaption,
    updateLessonImageOrders,
} from "../actions/lessonImages";
import {
    MAX_LESSON_IMAGES_PER_UPLOAD,
    MAX_LESSON_IMAGE_CAPTION_LENGTH,
} from "../lessonImages.constants";

export function LessonImages({
    lessonId,
    images,
}: {
    lessonId: string;
    images: { id: string; url: string; caption: string | null }[];
}) {
    const router = useRouter();
    const [isSaving, startTransition] = useTransition();
    const [isDragging, setIsDragging] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    const { startUpload, isUploading } = useUploadThing("lessonImage", {
        // Fires after the browser finishes uploading to UploadThing. We take
        // the returned URLs and persist them as lesson_images rows.
        onClientUploadComplete: files => {
            const urls = files.map(file => file.ufsUrl);
            startTransition(async () => {
                const data = await addLessonImages(lessonId, urls);
                actionToast({ actionData: data });
                router.refresh();
            });
        },
        onUploadError: error => {
            toast.error(error.message);
        },
    });

    const busy = isUploading || isSaving;

    function handleFiles(fileList: FileList | null) {
        if (fileList == null || fileList.length === 0) return;
        startUpload(Array.from(fileList));
    }

    return (
        <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
                <span className="text-sm font-semibold">Imágenes</span>
                {/* A plain count, not "3/3". There is no ceiling to count
                    towards any more, so the number is just information about
                    the lesson rather than a budget being spent. */}
                {images.length > 0 && (
                    <span className="text-xs text-muted-foreground">
                        {formatPlural(images.length, {
                            singular: "imagen",
                            plural: "imágenes",
                        })}
                    </span>
                )}
            </div>

            {images.length > 0 && (
                <SortableList items={images} onOrderChange={updateLessonImageOrders}>
                    {items =>
                        items.map(image => (
                            <SortableItem
                                key={image.id}
                                id={image.id}
                                className="items-start"
                            >
                                <LessonImageEditor image={image} />
                            </SortableItem>
                        ))
                    }
                </SortableList>
            )}

            {/* Always available — there is no longer a state in which the
                lesson is "full" and the dropzone has to be taken away. */}
            <div
                role="button"
                tabIndex={0}
                onClick={() => !busy && inputRef.current?.click()}
                onKeyDown={event => {
                    if ((event.key === "Enter" || event.key === " ") && !busy) {
                        event.preventDefault();
                        inputRef.current?.click();
                    }
                }}
                onDragOver={event => {
                    event.preventDefault();
                    setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={event => {
                    event.preventDefault();
                    setIsDragging(false);
                    if (!busy) handleFiles(event.dataTransfer.files);
                }}
                className={cn(
                    "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-6 text-center text-sm text-muted-foreground transition-colors",
                    isDragging && "border-primary bg-primary/5",
                    busy && "pointer-events-none opacity-60"
                )}
            >
                {busy ? (
                    <Loader2Icon className="size-5 animate-spin" />
                ) : (
                    <ImagePlusIcon className="size-5" />
                )}
                <span>
                    {busy
                        ? "Subiendo..."
                        : "Arrastra imágenes aquí o haz clic para seleccionar"}
                </span>
                {/* The only limits left are per-file size and how many can go
                    up in a single batch, so those are what the hint names. */}
                <span className="text-xs">
                    Máx. 4MB por imagen, hasta {MAX_LESSON_IMAGES_PER_UPLOAD} a
                    la vez
                </span>
                <input
                    ref={inputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    hidden
                    onChange={event => {
                        handleFiles(event.target.files);
                        event.target.value = "";
                    }}
                />
            </div>
        </div>
    );
}

function LessonImageEditor({
    image,
}: {
    image: { id: string; url: string; caption: string | null };
}) {
    const router = useRouter();
    const [caption, setCaption] = useState(image.caption ?? "");
    const [isSaving, startTransition] = useTransition();

    const originalCaption = image.caption ?? "";
    const hasChanges = caption !== originalCaption;

    function saveCaption() {
        const normalizedCaption = caption.trim();

        startTransition(async () => {
            const data = await updateLessonImageCaption(
                image.id,
                normalizedCaption
            );
            actionToast({ actionData: data });

            if (!data.error) {
                setCaption(normalizedCaption);
                router.refresh();
            }
        });
    }

    return (
        <div className="grid grow gap-3 sm:grid-cols-[auto_1fr_auto]">
            {/* Plain <img> avoids having to whitelist the UploadThing domain
                in next.config. */}
            <img
                src={image.url}
                alt=""
                className="size-20 rounded border object-cover"
            />

            <div className="flex min-w-0 flex-col gap-2">
                <label
                    htmlFor={`lesson-image-caption-${image.id}`}
                    className="text-sm font-semibold"
                >
                    Texto de la imagen{" "}
                    <span className="text-muted-foreground">(opcional)</span>
                </label>
                <Textarea
                    id={`lesson-image-caption-${image.id}`}
                    value={caption}
                    maxLength={MAX_LESSON_IMAGE_CAPTION_LENGTH}
                    onChange={event => setCaption(event.target.value)}
                    placeholder="Agrega un texto relacionado con esta imagen."
                    className="min-h-20 resize-y"
                />
                <div className="flex items-center justify-between gap-2">
                    <span className="text-xs text-muted-foreground">
                        {caption.length}/{MAX_LESSON_IMAGE_CAPTION_LENGTH}
                    </span>
                    <Button
                        type="button"
                        size="sm"
                        disabled={isSaving || !hasChanges}
                        onClick={saveCaption}
                    >
                        {isSaving ? (
                            <Loader2Icon className="animate-spin" />
                        ) : (
                            <SaveIcon />
                        )}
                        Guardar texto
                    </Button>
                </div>
            </div>

            <ActionButton
                type="button"
                action={deleteLessonImage.bind(null, image.id)}
                requireAreYouSure
                variant="destructiveOutline"
                size="sm"
            >
                <Trash2Icon />
                <span className="sr-only">Eliminar imagen</span>
            </ActionButton>
        </div>
    );
}
