import { describe, expect, test } from "vitest";
import { formatShortDate } from "./formatters";

describe("formatShortDate", () => {
    test("prints day, month and a two-digit year", () => {
        expect(formatShortDate(new Date("2026-08-17T15:00:00Z"))).toBe(
            "17/08/26"
        );
    });

    test("pads single-digit days and months", () => {
        // Every tab in the menu is the same width this way, so the dates line up
        // as a column instead of wandering.
        expect(formatShortDate(new Date("2026-03-05T15:00:00Z"))).toBe(
            "05/03/26"
        );
    });

    test("reads the date in Panama, not UTC", () => {
        // 20:30 on the 17th in Panama is 01:30 on the 18th in UTC. The school is
        // in Panama, so an announcement published that evening has to say the
        // 17th — the day it was actually published, as far as anyone involved is
        // concerned.
        expect(formatShortDate(new Date("2026-08-18T01:30:00Z"))).toBe(
            "17/08/26"
        );
    });

    test("stays on the same day either side of midnight UTC", () => {
        // The pair that would disagree if this were formatted from UTC parts.
        expect(formatShortDate(new Date("2026-08-17T23:59:00Z"))).toBe(
            "17/08/26"
        );
        expect(formatShortDate(new Date("2026-08-18T00:01:00Z"))).toBe(
            "17/08/26"
        );
    });

    test("crosses into the new year on Panama's midnight", () => {
        // 31 December 19:00 in Panama is already 1 January in UTC, and the year
        // is the part that makes that mistake glaring.
        expect(formatShortDate(new Date("2027-01-01T00:00:00Z"))).toBe(
            "31/12/26"
        );
        expect(formatShortDate(new Date("2027-01-01T05:00:00Z"))).toBe(
            "01/01/27"
        );
    });
});
