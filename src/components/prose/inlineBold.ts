// A stretch of a paragraph that is either emphasised or not. A paragraph turns
// into a short list of these, in order; joining every `text` back together
// reproduces the paragraph with its asterisks removed.
export type BoldSegment = { text: string; bold: boolean };

// Asterisks around a word make it bold, the way they do in WhatsApp.
//
// Both ends must touch a non-space, which is the rule that keeps ordinary prose
// intact: `2 * 3` is arithmetic, `* pan` is a bullet someone typed, and a lone
// `*` is a lone `*`. All three reach the page untouched, because in each of them
// an asterisk sits next to a space.
//
// The match is non-greedy, so `*uno* y *dos*` is two bold runs rather than one
// running from the first asterisk to the last and swallowing the " y " between
// them. An unpaired asterisk never eats the rest of the paragraph — it simply
// stays on the page as an asterisk, and the words after it are still read.
//
// A run may cross a newline, because a single newline inside a paragraph is a
// wrapped line rather than a break, and a sentence someone tidied in the admin
// textarea should still bold end to end. It cannot cross a blank line, though,
// and that is not enforced here: `splitIntoParagraphs` has already cut the text
// there, so a paragraph is the widest thing a stray asterisk can reach across.
//
// There is no way to write a literal `*bold*` and mean it. WhatsApp has no
// escape either, and inventing one costs every admin a backslash rule to learn.
//
// Its own module rather than sitting inside the component that draws the result,
// so the corners above can be tested in plain Node without a React tree behind
// them — the same reason `splitIntoParagraphs` lives next door.
//
// The boundaries exclude `*` as well as whitespace so that `**` and `***` have
// nothing to wrap and stay literal, rather than bolding an asterisk.
const BOLD_RUN = /\*([^*\s]|[^*\s][\s\S]*?[^*\s])\*/g;

export function splitIntoBoldSegments(paragraph: string): BoldSegment[] {
    const segments: BoldSegment[] = [];
    let plainFrom = 0;

    // `matchAll` rather than a loop over `exec`, so the regex's own `lastIndex`
    // is never left dangling between calls — the module-level regex is shared by
    // every paragraph on the page, and a stateful one would resume mid-string on
    // the next.
    for (const match of paragraph.matchAll(BOLD_RUN)) {
        const start = match.index;

        // The plain text since the previous run. Skipped when empty, which is
        // what stops a paragraph opening with a bold run from starting on an
        // empty segment.
        if (start > plainFrom) {
            segments.push({ text: paragraph.slice(plainFrom, start), bold: false });
        }

        segments.push({ text: match[1], bold: true });
        plainFrom = start + match[0].length;
    }

    // Whatever trails the last run — or the entire paragraph, when there were no
    // runs at all.
    if (plainFrom < paragraph.length) {
        segments.push({ text: paragraph.slice(plainFrom), bold: false });
    }

    return segments;
}
