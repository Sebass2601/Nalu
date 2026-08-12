import { describe, expect, test } from "vitest";
import {
    accessIsRevocable,
    accessOrigin,
    originIsRevocable,
} from "./courseAccessGrant";

describe("originIsRevocable", () => {
    test("a manual grant can be taken back", () => {
        expect(originIsRevocable("manual")).toBe(true);
    });

    test("a purchase cannot", () => {
        expect(originIsRevocable("purchase")).toBe(false);
    });
});

describe("accessIsRevocable", () => {
    test("a row an admin granted by hand can be taken back", () => {
        expect(accessIsRevocable({ grantedBy: "admin-uuid" })).toBe(true);
    });

    // The rule the whole admin screen is built to protect. A purchase writes no
    // `grantedBy`, so a NULL there means somebody paid, and the only thing that
    // may remove paid access is a refund.
    test("a row that came from a purchase cannot", () => {
        expect(accessIsRevocable({ grantedBy: null })).toBe(false);
    });

    // Every row written before `grantedBy` existed is NULL, so the ambiguous
    // case has to resolve to "protected" rather than "removable".
    test("treats a missing column as purchased, not as a grant", () => {
        expect(accessIsRevocable({ grantedBy: undefined })).toBe(false);
        expect(accessIsRevocable({})).toBe(false);
    });
});

describe("accessOrigin", () => {
    test("labels a hand-granted row as manual", () => {
        expect(accessOrigin({ grantedBy: "admin-uuid" })).toBe("manual");
    });

    test("labels a purchase-derived row as purchase", () => {
        expect(accessOrigin({ grantedBy: null })).toBe("purchase");
    });
});
