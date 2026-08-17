import { describe, expect, test } from "vitest";
import { splitIntoParagraphs } from "./paragraphs";

// The rule that turns what an admin typed into a textarea into paragraphs. It
// was previously private to the lesson body; now that a second feature renders
// through the same layout, the corners are worth stating.
describe("splitIntoParagraphs", () => {
    test("a blank line starts a new paragraph", () => {
        expect(splitIntoParagraphs("Uno\n\nDos")).toEqual(["Uno", "Dos"]);
    });

    test("a single newline does not — it is a wrapped line, not a break", () => {
        // Typing a line break to keep a sentence tidy in the textarea must not
        // split the sentence in half on the page.
        expect(splitIntoParagraphs("Una frase\ncontinúa aquí")).toEqual([
            "Una frase\ncontinúa aquí",
        ]);
    });

    test("a run of blank lines counts as one break", () => {
        expect(splitIntoParagraphs("Uno\n\n\n\nDos")).toEqual(["Uno", "Dos"]);
    });

    test("blank lines at either end produce no empty paragraphs", () => {
        // Otherwise the page opens with a gap where an empty <p> was drawn.
        expect(splitIntoParagraphs("\n\nUno\n\n")).toEqual(["Uno"]);
    });

    test("lines holding only spaces still separate paragraphs", () => {
        expect(splitIntoParagraphs("Uno\n   \nDos")).toEqual(["Uno", "Dos"]);
    });

    test("nothing written yet gives nothing to draw", () => {
        // A draft saved before its body exists. The caller renders no paragraphs
        // rather than one empty one.
        expect(splitIntoParagraphs(null)).toEqual([]);
        expect(splitIntoParagraphs("")).toEqual([]);
        expect(splitIntoParagraphs("   \n  \n ")).toEqual([]);
    });
});
