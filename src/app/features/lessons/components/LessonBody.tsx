import { YouTubeVideoPlayer } from "./YouTubeVideoPlayer";
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
    youtubeVideoId,
    content,
    images,
    onVideoFinished,
}: {
    type: LessonType;
    youtubeVideoId: string | null;
    content: string | null;
    images: LessonImage[];
    // Bound Server Action, absent when this lesson is already complete or the
    // viewer has no business recording progress against it.
    onVideoFinished?: () => void;
}) {
    if (type === "video") {
        return (
            <div className="flex flex-col gap-6">
                <div className="aspect-video w-full overflow-hidden rounded-xl border border-gold/40">
                    {youtubeVideoId ? (
                        <YouTubeVideoPlayer
                            videoId={youtubeVideoId}
                            onFinishedVideo={onVideoFinished}
                        />
                    ) : (
                        // An unfinished lesson rather than a broken one: the
                        // admin form allows saving a video lesson before its
                        // video id is filled in.
                        <div className="flex h-full w-full items-center justify-center bg-[#0a1628]/70 text-base text-ink-meta">
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
        <div className="flex select-none flex-col gap-4 text-ink-body">
            {lead && <p className="leading-relaxed">{lead}</p>}

            {/* The float and the text it wraps around must share one container,
                or the text has nothing to wrap against. The `after:` clearfix
                makes that container enclose the float, which is what stops a
                tall picture from spilling past the end of the lesson and over
                the navigation buttons below. */}
            <div className="after:block after:clear-both after:content-['']">
                <LessonGallery images={images} />
                {rest.map((paragraph, index) => (
                    <p key={index} className="mb-4 leading-relaxed last:mb-0">
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
