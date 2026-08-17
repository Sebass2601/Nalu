import { describe, expect, test } from "vitest";
import { landingLessonId } from "./freeCourseLanding";

// Vocabulary, because the two halves of this app disagree about it: a
// `courseSection` row is a "Clase" in the admin panel and on the free course
// page, and a `lesson` row is a "Sección". These tests use the table names, the
// way the rest of the codebase does.
describe("landingLessonId", () => {
    const at = (iso: string) => new Date(iso);

    test("an empty course has nowhere to land", () => {
        expect(landingLessonId([])).toBeNull();
    });

    test("lands on the first lesson of the only section", () => {
        expect(
            landingLessonId([
                {
                    createdAt: at("2026-01-01"),
                    lessons: [{ id: "a" }, { id: "b" }],
                },
            ])
        ).toBe("a");
    });

    test("lands on the most recently created section, not the last one listed", () => {
        // The admin can drag classes into any order, and the newest weekly
        // class is what visitors came for wherever it ended up sitting.
        expect(
            landingLessonId([
                { createdAt: at("2026-03-01"), lessons: [{ id: "new" }] },
                { createdAt: at("2026-01-01"), lessons: [{ id: "old" }] },
            ])
        ).toBe("new");
    });

    test("lands on that section's first lesson, not its newest", () => {
        // A class is read front to back. Its last lesson being the one added
        // most recently does not make it the way in.
        expect(
            landingLessonId([
                {
                    createdAt: at("2026-03-01"),
                    lessons: [{ id: "first" }, { id: "second" }],
                },
            ])
        ).toBe("first");
    });

    test("skips a newly added section that has no lessons in it yet", () => {
        // The real sequence in the admin panel: the class is created first and
        // filled afterwards. Between those two saves the newest class is empty,
        // and landing on it would mean landing on nothing.
        expect(
            landingLessonId([
                { createdAt: at("2026-01-01"), lessons: [{ id: "old" }] },
                { createdAt: at("2026-03-01"), lessons: [] },
            ])
        ).toBe("old");
    });

    test("a course whose every section is empty has nowhere to land", () => {
        expect(
            landingLessonId([
                { createdAt: at("2026-01-01"), lessons: [] },
                { createdAt: at("2026-03-01"), lessons: [] },
            ])
        ).toBeNull();
    });

    test("two sections created in the same save go to the later one listed", () => {
        // Timestamps can tie — a seed, or two saves inside the same second.
        // The admin's own ordering is the only other thing to go on, so the one
        // further down the list wins rather than the answer being arbitrary.
        expect(
            landingLessonId([
                { createdAt: at("2026-01-01"), lessons: [{ id: "upper" }] },
                { createdAt: at("2026-01-01"), lessons: [{ id: "lower" }] },
            ])
        ).toBe("lower");
    });
});
