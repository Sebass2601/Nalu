import { LessonVideoPlayer } from "./LessonVideoPlayer";
import { LessonGallery, type LessonImage } from "./LessonGallery";
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
    images: LessonImage[];
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
                        <LessonGallery images={images} />
                    </div>
                )}
            </div>
        );
    }

    return <LessonText content={content} images={images} />;
}

// A written lesson, laid out as the sketch describes: an opening passage across
// the full width, then the picture set into the left of the text with the rest
// of the writing flowing around and below it.
//
// Every word inside a lesson is set the same way: `font-sans`, one size, one
// weight, one colour. No line of it is promoted, emphasised or coloured on any
// rule the code invents.
//
// The font override is the load-bearing part. The lesson page inherits Cinzel
// from the course layout, and Cinzel is an inscriptional face with no lowercase
// — it draws small capitals in its place. That is right for the title above and
// unreadable at the length of a lesson, which is what this is fixing.
//
// Gold stops at the title. On this page it marks the lesson's name and the way
// back to the contents, and nothing else, so a reader can tell at a glance what
// is a heading and what is the lesson.
function LessonText({
    content,
    images,
}: {
    content: string | null;
    images: LessonImage[];
}) {
    const paragraphs = splitIntoParagraphs(content);

    // With more than one paragraph the first one runs full width and the
    // picture starts below it, so the lesson opens with prose rather than with
    // an image pinned to the corner. A single-paragraph lesson has nothing to
    // put above it, so the picture simply starts at the top.
    const hasLead = paragraphs.length > 1;
    const lead = hasLead ? paragraphs[0] : null;
    const rest = hasLead ? paragraphs.slice(1) : paragraphs;

    // `select-none` covers the whole written lesson rather than each paragraph,
    // so a drag that starts in one paragraph and ends in another still selects
    // nothing. It discourages lifting the course text wholesale; it is not a
    // lock — the words are in the HTML either way — so nothing here depends on
    // it holding.
    return (
        <div className="flex select-none flex-col gap-4 font-sans text-base leading-relaxed tracking-normal text-ink-body">
            {lead && <p>{lead}</p>}

            {/* The float and the text it wraps around must share one container,
                or the text has nothing to wrap against. The `after:` clearfix
                makes that container enclose the float, which is what stops a
                tall picture from spilling past the end of the lesson and over
                the navigation buttons below. */}
            <div className="after:block after:clear-both after:content-['']">
                <LessonGallery images={images} />
                {rest.map((paragraph, index) => (
                    <p key={index} className="mb-4 last:mb-0">
                        {paragraph}
                    </p>
                ))}
            </div>
        </div>
    );
}

// Blank lines separate paragraphs, which is how the text reads in the admin
// textarea that produced it. Runs of whitespace-only lines count as one break,
// and trailing blank lines produce no empty paragraphs.
function splitIntoParagraphs(content: string | null) {
    if (content == null) return [];

    return content
        .split(/\n\s*\n/)
        .map(paragraph => paragraph.trim())
        .filter(paragraph => paragraph.length > 0);
}
