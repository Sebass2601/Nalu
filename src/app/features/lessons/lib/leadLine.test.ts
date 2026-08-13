import { describe, expect, test } from "vitest";
import { isLeadLine } from "./leadLine";

// A body paragraph to sit under whatever is being tested — long enough to be
// unambiguously prose, so each test is about the line above it.
const BODY =
    "En este portal descubrirás el arte de la numerología, el universo simbólico de los números y su relación con la personalidad, los ciclos de la vida y las relaciones humanas.";

describe("isLeadLine", () => {
    test("promotes a short announcing sentence followed by prose", () => {
        expect(isLeadLine("Cada instante abre nuevas posibilidades.", BODY)).toBe(
            true
        );
    });

    test("promotes a question, opening punctuation and all", () => {
        expect(isLeadLine("¿Qué puerta deseas abrir primero?", BODY)).toBe(true);
    });

    test("promotes a line that ends in a colon, which announces by definition", () => {
        expect(isLeadLine("Tres cosas hacen ese trabajo:", BODY)).toBe(true);
    });

    test("leaves a long paragraph alone", () => {
        expect(isLeadLine(BODY, BODY)).toBe(false);
    });

    test("leaves two short sentences alone, being an explanation already", () => {
        expect(
            isLeadLine("Todo tiene un orden. Todo tiene un lenguaje.", BODY)
        ).toBe(false);
    });

    test("leaves a fragment with no terminator alone", () => {
        expect(isLeadLine("La biblioteca de los números", BODY)).toBe(false);
    });

    // The condition that keeps this from firing all over a lesson.
    test("leaves the last paragraph alone, having nothing to lead into", () => {
        expect(
            isLeadLine("Cada instante abre nuevas posibilidades.", undefined)
        ).toBe(false);
    });

    test("leaves a short line followed by another short line alone", () => {
        expect(
            isLeadLine("Cada instante abre nuevas posibilidades.", "Y así fue.")
        ).toBe(false);
    });

    test("does not promote a paragraph one character over the limit", () => {
        const line = `${"a".repeat(90)}.`;

        expect(line.length).toBeGreaterThan(90);
        expect(isLeadLine(line, BODY)).toBe(false);
    });
});
