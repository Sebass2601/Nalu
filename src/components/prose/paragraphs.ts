// Blank lines separate paragraphs, which is how the text reads in the admin
// textarea that produced it. Runs of whitespace-only lines count as one break,
// and trailing blank lines produce no empty paragraphs.
//
// A single newline is left alone on purpose: inside a paragraph it is a wrapped
// line, and splitting on it would break a sentence someone tidied in the
// textarea into two paragraphs on the page.
//
// Its own module rather than sitting beside the component that draws the result,
// so it can be tested in plain Node without pulling a React tree in behind it.
export function splitIntoParagraphs(content: string | null) {
    if (content == null) return [];

    return content
        .split(/\n\s*\n/)
        .map(paragraph => paragraph.trim())
        .filter(paragraph => paragraph.length > 0);
}
