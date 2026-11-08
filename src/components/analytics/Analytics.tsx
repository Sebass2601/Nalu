import { GoogleAnalytics } from "@next/third-parties/google";
import { getUserCountry } from "@/lib/getUserCountry";
import { ANALYTICS_ENABLED, GA_ID, needsCookieConsent } from "@/lib/analytics";
import { CookieConsent, CookieSettingsButton } from "./CookieConsent";

// Google Analytics, loaded the way the visitor's country requires.
//
// Outside Europe it loads straight away, exactly as it always has. In Europe —
// or when the country is unknown — the visitor gets the cookie notice instead,
// and Google loads only if they accept.
//
// Reads the request's country, so it renders per request; the root layout
// wraps it in <Suspense> so every page's static shell is still sent first.
export async function Analytics() {
    if (!ANALYTICS_ENABLED) return null;

    const country = await getUserCountry();

    if (needsCookieConsent(country)) return <CookieConsent gaId={GA_ID} />;

    return <GoogleAnalytics gaId={GA_ID} />;
}

// The footer's "Cookies" link, shown only to the visitors who were asked — for
// anyone else there is no choice to revisit. Same per-request reading, and the
// same <Suspense> around it in LegalFooter.
export async function CookieSettingsLink({ className }: { className?: string }) {
    if (!ANALYTICS_ENABLED) return null;

    const country = await getUserCountry();

    if (!needsCookieConsent(country)) return null;

    return <CookieSettingsButton className={className} />;
}
