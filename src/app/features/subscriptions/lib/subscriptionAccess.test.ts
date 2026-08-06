import { describe, expect, test } from "vitest";
import { subscriptionGrantsAccess } from "./subscriptionAccess";

const NOW = new Date("2026-08-06T12:00:00Z");

function endingAt(iso: string) {
    return { currentPeriodEnd: new Date(iso) };
}

describe("subscriptionGrantsAccess", () => {
    test("grants access while the paid period is still running", () => {
        expect(subscriptionGrantsAccess(endingAt("2026-09-01T00:00:00Z"), NOW)).toBe(
            true
        );
    });

    // The case that motivated splitting this out. Evaluated inside the cached
    // query, an expired subscription kept granting access until the cache
    // entry happened to regenerate.
    test("refuses access once the paid period has passed", () => {
        expect(subscriptionGrantsAccess(endingAt("2026-08-01T00:00:00Z"), NOW)).toBe(
            false
        );
    });

    test("refuses access at the exact moment the period ends", () => {
        expect(subscriptionGrantsAccess(endingAt(NOW.toISOString()), NOW)).toBe(
            false
        );
    });

    test("refuses access when there is no subscription at all", () => {
        expect(subscriptionGrantsAccess(undefined, NOW)).toBe(false);
        expect(subscriptionGrantsAccess(null, NOW)).toBe(false);
    });

    // The same row answers differently as time passes — which is the whole
    // property that was lost by freezing the comparison in a cached scope.
    test("the same row expires as time moves past its end date", () => {
        const subscription = endingAt("2026-08-06T12:30:00Z");

        expect(
            subscriptionGrantsAccess(subscription, new Date("2026-08-06T12:29:00Z"))
        ).toBe(true);
        expect(
            subscriptionGrantsAccess(subscription, new Date("2026-08-06T12:31:00Z"))
        ).toBe(false);
    });
});
