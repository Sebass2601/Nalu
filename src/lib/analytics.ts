// Google Analytics, and who has to be asked before it runs.
//
// The ID is public by design: it is readable in every page's source, so it
// needs no secret or environment variable.
export const GA_ID = "G-91VKFH955R";

// Production only, so local `pnpm dev` visits are not counted as real traffic.
// The consent notice and the footer's "Cookies" link follow the same switch:
// with no analytics there is nothing to consent to.
export const ANALYTICS_ENABLED = process.env.NODE_ENV === "production";

// Where the law requires asking before analytics cookies are set: the
// European Economic Area (the 27 EU members plus Iceland, Liechtenstein and
// Norway) under the ePrivacy Directive and GDPR, and the United Kingdom and
// Switzerland, whose rules follow the same model. Everywhere else — Panama and
// Latin America, where most visitors come from — analytics loads as before.
//
// ISO 3166-1 alpha-2, the form Arcjet's geolocation reports and proxy.ts
// forwards. Note Greece is "GR", not the "EL" the EU uses for itself.
const CONSENT_COUNTRIES = new Set([
    // European Union
    "AT", "BE", "BG", "HR", "CY", "CZ", "DK", "EE", "FI", "FR", "DE", "GR",
    "HU", "IE", "IT", "LV", "LT", "LU", "MT", "NL", "PL", "PT", "RO", "SK",
    "SI", "ES", "SE",
    // Rest of the EEA
    "IS", "LI", "NO",
    // Same model outside the EEA
    "GB", "CH",
]);

// Whether this visitor must be asked before Google Analytics loads.
//
// An unknown country is asked too. The country comes from Arcjet, and when its
// lookup fails — an outage, an address it cannot place — the safe mistake is
// showing a notice to someone who did not need it, not tracking someone who
// should have been asked.
export function needsCookieConsent(country: string | null) {
    return country == null || CONSENT_COUNTRIES.has(country);
}

// Where a visitor's answer is kept, in their own browser, so they are asked
// once rather than on every visit. Read and written only by CookieConsent.
export const CONSENT_STORAGE_KEY = "nalu-cookie-consent";

// Fired on `window` by the footer's "Cookies" link to reopen the notice, so a
// visitor can withdraw consent as easily as they gave it — which the law asks
// for in so many words.
export const OPEN_COOKIE_SETTINGS_EVENT = "nalu:open-cookie-settings";
