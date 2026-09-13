import { describe, expect, test } from "vitest";
import { splitIntoParagraphs } from "./paragraphs";

// The rule that turns what an admin typed into a textarea into paragraphs. It
// was previously private to the lesson body; now that a second feature renders
// through the same layout, the corners are worth stating.
describe("splitIntoParagraphs", () => {
    test("a blank line starts a new paragraph", () => {
        expect(splitIntoParagraphs("Uno\n\nDos")).toEqual(["Uno", "Dos"]);
    });

    test("a single newline does not — it stays inside the paragraph", () => {
        // It is not discarded either: the newline survives into the string, and
        // `ProseWithImages` draws it as a line break with `whitespace-pre-line`.
        // Cutting here instead would put the two lines in separate paragraphs
        // and open the wider blank-line gap between them.
        expect(splitIntoParagraphs("Una frase\ncontinúa aquí")).toEqual([
            "Una frase\ncontinúa aquí",
        ]);
    });

    test("a list typed a line at a time stays one paragraph", () => {
        // The shape an admin actually writes. Every line is kept, in order, in
        // one paragraph — so the page draws them stacked rather than running
        // them together into a block of prose.
        expect(
            splitIntoParagraphs("✦ fechas que se espejan\n✦ patrones\n✦ edades"),
        ).toEqual(["✦ fechas que se espejan\n✦ patrones\n✦ edades"]);
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
