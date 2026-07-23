// The request header that proxy.ts stamps with the buyer's ISO country code
// (from Arcjet's geolocation). Kept in its own module — with no `next/headers`
// import — so the proxy can import the key without pulling server-only APIs
// into the middleware bundle.
export const COUNTRY_HEADER_KEY = "x-user-country";
