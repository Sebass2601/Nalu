import { describe, expect, test } from "vitest";
import { lessonNeighbours } from "./freeCourseNeighbours";

// A `lesson` row is a "Sección" on the page; the `courseSection` holding them is
// a "Clase". These walk within one class and deliberately stop at its edges.
describe("lessonNeighbours", () => {
    const lessons = [{ id: "a" }, { id: "b" }, { id: "c" }];

    test("the middle lesson has one on either side", () => {
        expect(lessonNeighbours(lessons, "b")).toEqual({
            previous: { id: "a" },
            next: { id: "c" },
        });
    });

    test("the first lesson of the class has nothing before it", () => {
        // The point of the pair being scoped to one class: "Anterior" here must
        // not reach back into whatever class was published before this one.
        expect(lessonNeighbours(lessons, "a")).toEqual({
            previous: null,
            next: { id: "b" },
        });
    });

    test("the last lesson of the class has nothing after it", () => {
        expect(lessonNeighbours(lessons, "c")).toEqual({
            previous: { id: "b" },
            next: null,
        });
    });

    test("a class of one lesson has neither", () => {
        expect(lessonNeighbours([{ id: "only" }], "only")).toEqual({
            previous: null,
            next: null,
        });
    });

    test("a lesson that is not in the list has neither", () => {
        // Not reachable through the menu, but a hand-typed URL can ask for it,
        // and guessing a neighbour for an unknown lesson would send the reader
        // somewhere arbitrary.
        expect(lessonNeighbours(lessons, "elsewhere")).toEqual({
            previous: null,
            next: null,
        });
    });
});
