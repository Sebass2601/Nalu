import { describe, expect, test } from "vitest";
import {
    pageDistance,
    snapToCardGrid,
    wrapOntoMiddleCopy,
} from "./stripGeometry";

// These three sums are the whole of `DraggableStrip` that can be checked
// without a browser, and they are the part a mistake hides in: every one of
// them is off-by-a-few-pixels arithmetic whose failure looks like a slightly
// wrong resting position rather than anything that throws.
//
// They matter most to the strips that loop — the free classes and the
// subscription rows — where `wrapOntoMiddleCopy` runs on every swipe and a
// wrong answer shows up as a stutter at one point in the loop.

describe("snapToCardGrid", () => {
    test("an offset already on a boundary does not move", () => {
        expect(snapToCardGrid(600, 0, 200)).toBe(600);
    });

    test("an offset just past a boundary rounds back down to it", () => {
        expect(snapToCardGrid(610, 0, 200)).toBe(600);
    });

    test("an offset near the next boundary rounds up to it", () => {
        expect(snapToCardGrid(790, 0, 200)).toBe(800);
    });

    // The padded strip: the first card starts at 16, so the grid is
    // 16, 216, 416 — not 0, 200, 400. Ignoring the origin would leave every
    // card resting sixteen pixels out.
    test("the grid is measured from the origin, not from zero", () => {
        expect(snapToCardGrid(200, 16, 200)).toBe(216);
        expect(snapToCardGrid(100, 16, 200)).toBe(16);
    });

    test("an offset before the origin can round back onto it", () => {
        expect(snapToCardGrid(4, 16, 200)).toBe(16);
    });

    // A drag can leave the strip mid-card. Snapping has to fix that outright
    // rather than preserve the offset into the next move.
    test("a half-card offset is resolved, not carried", () => {
        expect(snapToCardGrid(500, 0, 200)).toBe(600);
        expect(snapToCardGrid(499, 0, 200)).toBe(400);
    });

    // Nothing measured yet: one card, or none. There is no grid, and dividing
    // by the step would be a division by zero.
    test("an unmeasured step leaves the offset alone", () => {
        expect(snapToCardGrid(437, 16, 0)).toBe(437);
    });
});

describe("pageDistance", () => {
    test("moves by as many whole cards as fit", () => {
        // Three 200px cards fit in 700px; the leftover 100 is not travelled,
        // or the strip would come to rest mid-card.
        expect(pageDistance(700, 200)).toBe(600);
    });

    test("an exact fit travels the whole viewport", () => {
        expect(pageDistance(800, 200)).toBe(800);
    });

    // The phone case: a card is nearly the width of the screen, so one card is
    // all that fits and a page is one card.
    test("one card per page when only one fits", () => {
        expect(pageDistance(560, 400)).toBe(400);
    });

    // Rounding down to zero cards would freeze the arrows entirely, which is
    // worse than overshooting the box by a little.
    test("a card larger than the viewport still moves one card", () => {
        expect(pageDistance(300, 400)).toBe(400);
    });

    test("an unmeasured step falls back to the viewport", () => {
        expect(pageDistance(700, 0)).toBe(700);
    });
});

describe("wrapOntoMiddleCopy", () => {
    // Resting range is [period, 2 * period) — the middle copy of three.
    test("an offset inside the middle copy does not move", () => {
        expect(wrapOntoMiddleCopy(1000, 1000)).toBe(0);
        expect(wrapOntoMiddleCopy(1500, 1000)).toBe(0);
    });

    test("running off the far end jumps one period back", () => {
        expect(wrapOntoMiddleCopy(2000, 1000)).toBe(-1000);
        expect(wrapOntoMiddleCopy(2400, 1000)).toBe(-1000);
    });

    test("running off the near end jumps one period forward", () => {
        expect(wrapOntoMiddleCopy(999, 1000)).toBe(1000);
        expect(wrapOntoMiddleCopy(0, 1000)).toBe(1000);
    });

    // The boundaries are where an off-by-one shows up as a visible stutter at
    // exactly one point in the loop, so both are pinned.
    test("the range includes its start and excludes its end", () => {
        expect(wrapOntoMiddleCopy(1000, 1000)).toBe(0);
        expect(wrapOntoMiddleCopy(2000, 1000)).toBe(-1000);
    });

    // No clones: the strip does not loop, or nothing overflows. A strip with a
    // real first and last card must never be wrapped past either.
    test("a strip with no period is never wrapped", () => {
        expect(wrapOntoMiddleCopy(0, 0)).toBe(0);
        expect(wrapOntoMiddleCopy(5000, 0)).toBe(0);
    });
});
