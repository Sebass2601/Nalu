import { headers } from "next/headers";
import { COUNTRY_HEADER_KEY } from "./userCountryHeader";

// Reads the ISO 3166-1 alpha-2 country code that proxy.ts resolved from Arcjet
// geolocation and stamped onto the request. Returns null when the country is
// unknown (e.g. on localhost, where the loopback IP has no country).
//
// Calling this makes the surrounding server component dynamic, which is what we
// want: a PPP-adjusted price must not be statically cached across countries.
export async function getUserCountry() {
    const country = (await headers()).get(COUNTRY_HEADER_KEY);
    return country || null;
}
