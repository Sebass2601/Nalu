const HOME = "/";

// Anything that is not a single, unambiguous path on this site. Two separate
// tests, because they catch different things:
//
//   - a control character anywhere. Browsers strip or normalise some of these
//     before parsing a URL, so a string that looks inert here can be read as
//     something else there. Nothing legitimate needs one;
//   - the shape itself: one leading "/", and the character after it neither "/"
//     nor "\". That second character is the whole defence. "//evil.com" begins
//     with a slash exactly like an internal path does, and a browser reads it as
//     "the scheme we are already on, host evil.com" — so a `startsWith("/")`
//     check, which is the obvious way to write this, lets the attack straight
//     through. Backslash is refused alongside it because browsers have long
//     normalised "\" to "/" inside URLs.
//
const CONTROL_CHARACTER = /[\u0000-\u001f\u007f]/;
const INTERNAL_PATH = /^\/([^/\\].*)?$/;

// Where to send somebody after they sign in, given the `next` parameter their
// login URL was carrying.
//
// That parameter is written by whoever composed the link, which means it is
// attacker-controlled. The attack it enables is an open redirect: a link to our
// own login page, carrying their address, that forwards the visitor onward the
// moment they authenticate. It is dangerous precisely because it arrives wearing
// our domain — the visitor checks the host, sees us, signs in, and lands
// somewhere else with their guard down.
//
// So this never repairs a suspicious value, it discards it. Returning the
// homepage for anything it does not positively recognise means the failure mode
// is a visitor who has to navigate back to where they were, rather than one who
// is quietly sent somewhere we did not choose.
//
// The parameter type matches what a Next.js page reads out of `searchParams`: a
// string when it appears once, an array when it appears twice, undefined when it
// is absent. A repeat is refused rather than resolved, since picking one of two
// values would be inventing an answer.
export function safeReturnPath(
    raw: string | string[] | null | undefined
): string {
    if (typeof raw !== "string") return HOME;
    if (CONTROL_CHARACTER.test(raw)) return HOME;
    if (!INTERNAL_PATH.test(raw)) return HOME;

    return raw;
}
