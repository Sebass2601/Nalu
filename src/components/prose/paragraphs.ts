// Blank lines separate paragraphs, which is how the text reads in the admin
// textarea that produced it. Runs of whitespace-only lines count as one break,
// and trailing blank lines produce no empty paragraphs.
//
// A single newline is left alone on purpose, but not because it is invisible.
// It stays inside the paragraph string and `ProseWithImages` draws it as a line
// break, so a list typed a line at a time comes out as a list. Splitting on it
// here instead would make every one of those lines its own paragraph and open
// the wider blank-line gap between them, which is a different shape from the
// one the admin typed.
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
