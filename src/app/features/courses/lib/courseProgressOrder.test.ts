import { describe, expect, test } from "vitest";
import { orderByProgressBand, orderFreeClasses } from "./courseProgressOrder";

// Vocabulary, because the two halves of this app disagree about it: a
// `courseSection` row is a "Clase" and a `lesson` row is a "Sección". A free
// class is a whole course by the time it reaches here, holding one of the
// former by convention. These tests use the table names, as the rest of the
// codebase does.
describe("orderFreeClasses", () => {
    const at = (iso: string) => new Date(iso);

    // Only the fields the ordering turns on. Anything else a card needs comes
    // along untouched, which the last test pins down.
    const course = (
        id: string,
        createdAt: string,
        lessonCount: number,
        completedCount: number
    ) => ({ id, createdAt: at(createdAt), lessonCount, completedCount });

    const ids = (courses: { id: string }[]) => courses.map(c => c.id);

    test("an empty list stays empty", () => {
        expect(orderFreeClasses([])).toEqual([]);
    });

    test("started but unfinished comes before untouched", () => {
        expect(
            ids(
                orderFreeClasses([
                    course("untouched", "2026-01-01", 3, 0),
                    course("started", "2026-01-01", 3, 1),
                ])
            )
        ).toEqual(["started", "untouched"]);
    });

    test("finished sinks below untouched", () => {
        // Something read to the end is done with. It stays on the page — it can
        // be read again — but it is the last thing to offer someone, behind
        // even a class they have never opened.
        expect(
            ids(
                orderFreeClasses([
                    course("finished", "2026-01-01", 2, 2),
                    course("untouched", "2026-01-01", 2, 0),
                ])
            )
        ).toEqual(["untouched", "finished"]);
    });

    test("all three bands in order", () => {
        expect(
            ids(
                orderFreeClasses([
                    course("finished", "2026-01-01", 2, 2),
                    course("untouched", "2026-01-01", 2, 0),
                    course("started", "2026-01-01", 2, 1),
                ])
            )
        ).toEqual(["started", "untouched", "finished"]);
    });

    test("newest first within a band", () => {
        expect(
            ids(
                orderFreeClasses([
                    course("old", "2026-01-01", 2, 0),
                    course("new", "2026-03-01", 2, 0),
                    course("middle", "2026-02-01", 2, 0),
                ])
            )
        ).toEqual(["new", "middle", "old"]);
    });

    test("the band wins over the date", () => {
        // A class started months ago still beats one published this morning.
        // Picking up where you left off is the point of the ordering; being new
        // only decides ties inside a band.
        expect(
            ids(
                orderFreeClasses([
                    course("new-untouched", "2026-06-01", 2, 0),
                    course("old-started", "2026-01-01", 2, 1),
                ])
            )
        ).toEqual(["old-started", "new-untouched"]);
    });

    test("a class with nothing published in it is untouched, not finished", () => {
        // 0 of 0 is arithmetically complete and is nothing of the sort. A class
        // whose sections are all still private has not been read by anybody, and
        // sinking it to the bottom would bury it on the day it goes up.
        expect(
            ids(
                orderFreeClasses([
                    course("finished", "2026-01-01", 2, 2),
                    course("empty", "2026-01-01", 0, 0),
                ])
            )
        ).toEqual(["empty", "finished"]);
    });

    test("more completions than sections still counts as finished", () => {
        // Possible whenever a section is unpublished after somebody ticked it:
        // the tick survives, the section is gone from the total. Anything at or
        // past the total is finished.
        expect(
            ids(
                orderFreeClasses([
                    course("over", "2026-01-01", 2, 5),
                    course("untouched", "2026-01-01", 2, 0),
                ])
            )
        ).toEqual(["untouched", "over"]);
    });

    test("with no progress at all, it is newest first", () => {
        // What every signed-out visitor sees: nothing is completed, so every
        // class is in the untouched band and the date is the only thing left.
        expect(
            ids(
                orderFreeClasses([
                    course("old", "2026-01-01", 2, 0),
                    course("new", "2026-03-01", 2, 0),
                ])
            )
        ).toEqual(["new", "old"]);
    });

    test("ties keep the order they arrived in", () => {
        // Same band, same timestamp. The query hands them over sorted, and a
        // stable sort means that order survives rather than being scrambled.
        expect(
            ids(
                orderFreeClasses([
                    course("first", "2026-01-01", 2, 0),
                    course("second", "2026-01-01", 2, 0),
                ])
            )
        ).toEqual(["first", "second"]);
    });

    test("does not modify the list it is given", () => {
        const courses = [
            course("untouched", "2026-01-01", 2, 0),
            course("started", "2026-01-01", 2, 1),
        ];

        orderFreeClasses(courses);

        expect(ids(courses)).toEqual(["untouched", "started"]);
    });

    test("carries the rest of the card through untouched", () => {
        const [only] = orderFreeClasses([
            { ...course("a", "2026-01-01", 2, 1), name: "Clase suelta" },
        ]);

        expect(only.name).toBe("Clase suelta");
    });
});

// The shelf's version: the same three bands, and nothing else. Whatever order
// the caller already had inside a band survives, which is how "Mis cursos"
// keeps its alphabetical run without this function knowing about names.
describe("orderByProgressBand", () => {
    const course = (
        id: string,
        lessonCount: number,
        completedCount: number
    ) => ({ id, lessonCount, completedCount });

    const ids = (courses: { id: string }[]) => courses.map(c => c.id);

    test("an empty shelf stays empty", () => {
        expect(orderByProgressBand([])).toEqual([]);
    });

    test("started, then owned but unstarted, then finished", () => {
        expect(
            ids(
                orderByProgressBand([
                    course("finished", 4, 4),
                    course("unstarted", 4, 0),
                    course("started", 4, 1),
                ])
            )
        ).toEqual(["started", "unstarted", "finished"]);
    });

    test("alphabetical order survives inside a band", () => {
        // What the shelf actually relies on. The query hands these over sorted
        // by name; a stable sort moves them between bands without disturbing
        // the run inside each one.
        expect(
            ids(
                orderByProgressBand([
                    course("Ajedrez", 3, 3),
                    course("Botánica", 3, 0),
                    course("Cocina", 3, 3),
                    course("Danza", 3, 1),
                    course("Esgrima", 3, 0),
                ])
            )
        ).toEqual([
            "Danza",
            "Botánica",
            "Esgrima",
            "Ajedrez",
            "Cocina",
        ]);
    });

    test("a course with nothing published in it counts as unstarted", () => {
        expect(
            ids(
                orderByProgressBand([
                    course("finished", 2, 2),
                    course("empty", 0, 0),
                ])
            )
        ).toEqual(["empty", "finished"]);
    });

    test("more completions than lessons still counts as finished", () => {
        expect(
            ids(
                orderByProgressBand([
                    course("over", 2, 5),
                    course("unstarted", 2, 0),
                ])
            )
        ).toEqual(["unstarted", "over"]);
    });

    test("a shelf with nothing started keeps the order it came in", () => {
        expect(
            ids(
                orderByProgressBand([
                    course("Ajedrez", 3, 0),
                    course("Botánica", 3, 0),
                    course("Cocina", 3, 0),
                ])
            )
        ).toEqual(["Ajedrez", "Botánica", "Cocina"]);
    });

    test("does not modify the list it is given", () => {
        const courses = [course("unstarted", 2, 0), course("started", 2, 1)];

        orderByProgressBand(courses);

        expect(ids(courses)).toEqual(["unstarted", "started"]);
    });

    test("carries the rest of the card through untouched", () => {
        const [only] = orderByProgressBand([
            { ...course("a", 2, 1), name: "Curso suelto" },
        ]);

        expect(only.name).toBe("Curso suelto");
    });
});
