import { ImageGallery, type GalleryImage } from "./ImageGallery";
import { splitIntoParagraphs } from "./paragraphs";

// A piece of writing with its pictures set into it: an opening passage across the
// full width, then the picture floated into the left of the text with the rest of
// the writing flowing around and below it.
//
// This is the layout of a text lesson, and now also of an announcement. It was
// private to the lesson body until the second one arrived; sharing it is what
// keeps the two from drifting into two different-looking pages that were meant to
// look the same.
//
// Every word is set the same way: `font-sans`, one size, one weight, one colour.
// No line of it is promoted, emphasised or coloured on any rule the code invents.
//
// The font override is the load-bearing part. Both pages sit inside layouts that
// set Cinzel, and Cinzel is an inscriptional face with no lowercase — it draws
// small capitals in its place. That is right for a title and unreadable at the
// length of a body, which is what this is fixing.
//
// Gold is left to the caller's heading. Inside here nothing is gold, so a reader
// can tell at a glance what is a heading and what is the text.
export function ProseWithImages({
    content,
    images,
}: {
    content: string | null;
    images: GalleryImage[];
}) {
    const paragraphs = splitIntoParagraphs(content);

    // With more than one paragraph the first one runs full width and the picture
    // starts below it, so the page opens with prose rather than with an image
    // pinned to the corner. A single paragraph has nothing to put above it, so
    // the picture simply starts at the top.
    const hasLead = paragraphs.length > 1;
    const lead = hasLead ? paragraphs[0] : null;
    const rest = hasLead ? paragraphs.slice(1) : paragraphs;

    // `select-none` covers the whole passage rather than each paragraph, so a
    // drag that starts in one paragraph and ends in another still selects
    // nothing. It discourages lifting the text wholesale; it is not a lock — the
    // words are in the HTML either way — so nothing here depends on it holding.
    return (
        <div className="flex select-none flex-col gap-4 font-sans text-base leading-relaxed tracking-normal text-ink-body">
            {lead && <p>{lead}</p>}

            {/* The float and the text it wraps around must share one container,
                or the text has nothing to wrap against. The `after:` clearfix
                makes that container enclose the float, which is what stops a tall
                picture from spilling past the end of the text and over whatever
                sits below it. */}
            <div className="after:block after:clear-both after:content-['']">
                <ImageGallery images={images} />
                {rest.map((paragraph, index) => (
                    <p key={index} className="mb-4 last:mb-0">
                        {paragraph}
                    </p>
                ))}
            </div>
        </div>
    );
}
