import { describe, expect, it } from "vitest";
import { needsCookieConsent } from "./analytics";

describe("needsCookieConsent", () => {
    it.each(["ES", "DE", "FR", "IT", "PT", "IE"])(
        "asks visitors from the EU (%s)",
        country => {
            expect(needsCookieConsent(country)).toBe(true);
        }
    );

    it.each(["NO", "IS", "LI"])(
        "asks visitors from the rest of the EEA (%s)",
        country => {
            expect(needsCookieConsent(country)).toBe(true);
        }
    );

    it.each(["GB", "CH"])(
        "asks visitors from the UK and Switzerland (%s)",
        country => {
            expect(needsCookieConsent(country)).toBe(true);
        }
    );

    it.each(["PA", "MX", "CO", "AR", "US", "VE"])(
        "does not ask visitors from outside Europe (%s)",
        country => {
            expect(needsCookieConsent(country)).toBe(false);
        }
    );

    it("asks when the country is unknown, to be safe", () => {
        expect(needsCookieConsent(null)).toBe(true);
    });
});
