import { LessonVideoPlayer } from "./LessonVideoPlayer";
import { ImageGallery, type GalleryImage } from "@/components/prose/ImageGallery";
import { ProseWithImages } from "@/components/prose/ProseWithImages";
import type { LessonType } from "@/drizzle/schema";

// The lesson itself: a video to watch, or a piece of writing to read with its
// pictures set into it.
//
// The two types are genuinely different shapes rather than one shape with a
// toggle. A video fills the width and the images, if any, follow it — there is
// no text for them to sit beside. A written lesson wraps its text around a
// single picture placed partway down, the way a page in a book does.
export function LessonBody({
    type,
    videoUrl,
    videoWidth,
    videoHeight,
    content,
    images,
    onVideoFinished,
}: {
    type: LessonType;
    // A presigned R2 URL, or null when the viewer is not entitled to watch or
    // the lesson has no video yet. Minted per request by the page — never
    // cached, never stored.
    videoUrl: string | null;
    // The video's own dimensions, recorded at upload. Null for anything
    // uploaded before they were being stored.
    videoWidth: number | null;
    videoHeight: number | null;
    content: string | null;
    images: GalleryImage[];
    // Bound Server Action, absent when this lesson is already complete or the
    // viewer has no business recording progress against it.
    onVideoFinished?: () => void;
}) {
    if (type === "video") {
        // Falls back to 9:16 when the dimensions are unknown — either an older
        // upload from before they were recorded, or a lesson with no video at
        // all, where the placeholder still needs a shape to sit in.
        const aspectWidth = videoWidth ?? 9;
        const aspectHeight = videoHeight ?? 16;

        return (
            <div className="flex flex-col gap-6">
                {/* The frame takes the video's own shape, so the gold border
                    hugs the picture whatever was uploaded — 9:16, square, or
                    landscape. Sized from stored dimensions rather than measured
                    at runtime, because the browser only learns a video's size
                    once metadata loads, and a box that resizes at that moment
                    makes the whole page jump.

                    The height is capped by capping the WIDTH, which reads
                    backwards but is the only thing that works. With an aspect
                    ratio and a full width, the width drives the height, so a
                    `max-h` afterwards leaves a box that no longer matches the
                    ratio — and the video letterboxes inside it, gold border
                    around the bars instead of the picture. Capping the width at
                    `80vh × ratio` makes the height come out at 80vh exactly.

                    Because the cap is in vh, a short viewport shrinks it too,
                    so the video can never run past the fold. */}
                <div
                    style={{
                        aspectRatio: `${aspectWidth} / ${aspectHeight}`,
                        maxWidth: `calc(80vh * ${aspectWidth} / ${aspectHeight})`,
                    }}
                    className="mx-auto w-full overflow-hidden rounded-xl border border-gold/40"
                >
                    {videoUrl ? (
                        <LessonVideoPlayer
                            src={videoUrl}
                            onFinishedVideo={onVideoFinished}
                        />
                    ) : (
                        // An unfinished lesson rather than a broken one: the
                        // admin form allows saving a video lesson before its
                        // video id is filled in.
                        <div className="flex h-full w-full items-center justify-center bg-[#0a1628]/70 font-sans text-base tracking-normal text-ink-meta">
                            Este vídeo aún no está disponible.
                        </div>
                    )}
                </div>

                {/* Centred rather than floated here. Floating exists to let text
                    run alongside a picture, and a video lesson has no running
                    text for it to run alongside. */}
                {images.length > 0 && (
                    <div className="mx-auto w-full max-w-md">
                        <ImageGallery images={images} />
                    </div>
                )}
            </div>
        );
    }

    return <ProseWithImages content={content} images={images} />;
}
