import { describe, expect, test } from "vitest";
import { splitIntoBoldSegments } from "./inlineBold";

// The rule that turns the asterisks an admin typed into emphasis, the way
// WhatsApp does it. `splitIntoParagraphs` has already run by the time this sees
// anything, so a paragraph is the largest thing a bold run can live in.
//
// The corners worth stating are all about what must NOT bold: prose is full of
// stray asterisks, and every one of them that gets eaten is a word the reader
// never sees.
describe("splitIntoBoldSegments", () => {
    test("a paragraph with no asterisks is one plain segment", () => {
        expect(splitIntoBoldSegments("Hola mundo")).toEqual([
            { text: "Hola mundo", bold: false },
        ]);
    });

    test("a pair of asterisks bolds what sits between them", () => {
        expect(splitIntoBoldSegments("Hola *mundo* bonito")).toEqual([
            { text: "Hola ", bold: false },
            { text: "mundo", bold: true },
            { text: " bonito", bold: false },
        ]);
    });

    test("the asterisks themselves are gone from the output", () => {
        // The whole point: they are marks, not content.
        const segments = splitIntoBoldSegments("Hola *mundo*");
        expect(segments.map(s => s.text).join("")).toBe("Hola mundo");
    });

    test("a run at the very start produces no empty segment before it", () => {
        // Otherwise every such paragraph opens with a stray empty <strong>'s
        // sibling, which is invisible but pointless.
        expect(splitIntoBoldSegments("*Aviso* importante")).toEqual([
            { text: "Aviso", bold: true },
            { text: " importante", bold: false },
        ]);
    });

    test("a run at the very end produces no empty segment after it", () => {
        expect(splitIntoBoldSegments("Muy *importante*")).toEqual([
            { text: "Muy ", bold: false },
            { text: "importante", bold: true },
        ]);
    });

    test("two runs stay two runs — the middle is not swallowed", () => {
        // The failure this guards is a greedy match reading from the first
        // asterisk to the last, bolding " y " along with them.
        expect(splitIntoBoldSegments("*uno* y *dos*")).toEqual([
            { text: "uno", bold: true },
            { text: " y ", bold: false },
            { text: "dos", bold: true },
        ]);
    });

    test("a single character can be bold", () => {
        expect(splitIntoBoldSegments("*A*")).toEqual([{ text: "A", bold: true }]);
    });

    test("a run may span a line break inside the paragraph", () => {
        // Single newlines are wrapped lines, not paragraph breaks, so an admin
        // who tidied a long sentence in the textarea still gets the bold they
        // asked for. This is WhatsApp's behaviour.
        expect(splitIntoBoldSegments("Una *frase\nque sigue* aquí")).toEqual([
            { text: "Una ", bold: false },
            { text: "frase\nque sigue", bold: true },
            { text: " aquí", bold: false },
        ]);
    });

    test("asterisks touching punctuation still bold", () => {
        expect(splitIntoBoldSegments("(*hola*)")).toEqual([
            { text: "(", bold: false },
            { text: "hola", bold: true },
            { text: ")", bold: false },
        ]);
    });

    // Everything below stays on the page exactly as typed.

    test("a lone asterisk is left alone", () => {
        expect(splitIntoBoldSegments("Nota * al margen")).toEqual([
            { text: "Nota * al margen", bold: false },
        ]);
    });

    test("asterisks used as multiplication do not bold", () => {
        // The reason both ends must touch a non-space: here they touch spaces.
        expect(splitIntoBoldSegments("2 * 3 * 4 = 24")).toEqual([
            { text: "2 * 3 * 4 = 24", bold: false },
        ]);
    });

    test("a space after the opening asterisk does not bold", () => {
        expect(splitIntoBoldSegments("* hola*")).toEqual([
            { text: "* hola*", bold: false },
        ]);
    });

    test("a space before the closing asterisk does not bold", () => {
        expect(splitIntoBoldSegments("*hola *")).toEqual([
            { text: "*hola *", bold: false },
        ]);
    });

    test("an unpaired asterisk keeps its text visible", () => {
        // The important half is that "importante" still reaches the reader.
        expect(splitIntoBoldSegments("Esto es *importante")).toEqual([
            { text: "Esto es *importante", bold: false },
        ]);
    });

    test("empty asterisks have nothing to bold", () => {
        expect(splitIntoBoldSegments("Vacío ** aquí")).toEqual([
            { text: "Vacío ** aquí", bold: false },
        ]);
        expect(splitIntoBoldSegments("Tres *** aquí")).toEqual([
            { text: "Tres *** aquí", bold: false },
        ]);
    });

    test("a bullet list typed with asterisks is not mangled", () => {
        // Each line opens with "* " — a space follows every asterisk, so none of
        // them pair up. This is the realistic version of the space rule.
        const list = "* pan\n* leche\n* huevos";
        expect(splitIntoBoldSegments(list)).toEqual([
            { text: list, bold: false },
        ]);
    });

    test("nothing written gives nothing to draw", () => {
        expect(splitIntoBoldSegments("")).toEqual([]);
    });
});
