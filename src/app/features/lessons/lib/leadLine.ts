// Whether a paragraph of lesson text is a lead line: a short sentence that
// announces the block under it, rather than a paragraph that explains something.
//
// It exists so a written lesson can carry the same rhythm /sobre-nosotros does —
// a line that announces in gold display type, then the prose that explains — off
// nothing but the text an author typed. There is no markup to learn and no
// second field in the admin form, which is the point: the alternative is
// changing how every lesson is written for the sake of styling.
//
// A heuristic, therefore, and one tuned to be shy. A false negative is invisible
// — the line stays body text, which is what it looks like today. A false
// positive puts a paragraph of gold display type in the middle of a lesson,
// which is not. Every rule below is chosen in that direction.
//
// Lives here rather than in the component so it can be tested as what it is: a
// pure function over strings, with no React around it.

// One breath. The shortest genuine paragraphs in the existing course text run
// well past this; a line that announces rarely reaches it.
export const LEAD_LINE_MAX_LENGTH = 90;

// `:` counts as a terminator because a line that ends in a colon is announcing
// the thing under it by definition. `¿` and `¡` are not counted at all: Spanish
// opens a question with one, and a question is a single sentence like any other.
const TERMINATORS = /[.!?…:]/g;

export function isLeadLine(
    paragraph: string,
    next: string | undefined
): boolean {
    // Nothing to lead into. This is the condition that does most of the work: it
    // keeps a short closing sentence at the end of a lesson as body text, which
    // is where a naive length test goes wrong most often.
    if (next == null) return false;

    if (paragraph.length > LEAD_LINE_MAX_LENGTH) return false;

    // Exactly one sentence, ended properly. Two sentences is already an
    // explanation however short it is, and a fragment with no terminator is
    // usually a paragraph that was cut off rather than a line meant to stand
    // alone.
    const terminators = paragraph.match(TERMINATORS) ?? [];
    if (terminators.length !== 1) return false;
    if (!/[.!?…:]$/.test(paragraph)) return false;

    // And what follows has to be a body paragraph. Checked by length rather than
    // by asking `isLeadLine` about the next one in turn: that recursion would
    // make the last paragraph of a lesson decide the styling of the first, and
    // it is how a run of short lines turns a whole lesson gold.
    return next.length > LEAD_LINE_MAX_LENGTH;
}
