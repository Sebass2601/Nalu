import { describe, expect, test } from "vitest";
import { safeReturnPath } from "./returnPath";

// Where sign-in sends someone afterwards, taken from a query parameter — which
// means it is attacker-controlled and cannot be handed to `redirectTo` as it
// arrives.
//
// The attack is an open redirect: a link to OUR login page, carrying THEIR
// address, that bounces the visitor onward the moment they sign in. It arrives
// wearing our domain, which is the whole of its value to a phisher. Every case
// below that returns "/" is one of those.
describe("safeReturnPath", () => {
    test("an ordinary internal path is kept", () => {
        expect(safeReturnPath("/courses/abc/lessons/xyz")).toBe(
            "/courses/abc/lessons/xyz"
        );
    });

    test("a query string and fragment survive", () => {
        expect(safeReturnPath("/courses/abc?tab=2#top")).toBe(
            "/courses/abc?tab=2#top"
        );
    });

    test("an absolute URL is refused", () => {
        expect(safeReturnPath("https://evil.com")).toBe("/");
        expect(safeReturnPath("http://evil.com/path")).toBe("/");
    });

    test("a protocol-relative URL is refused", () => {
        // The subtle one: it starts with "/" like an internal path, but the
        // browser reads "//evil.com" as "whatever scheme we are on, host
        // evil.com". A naive `startsWith("/")` check lets this straight through.
        expect(safeReturnPath("//evil.com")).toBe("/");
        expect(safeReturnPath("//evil.com/path")).toBe("/");
    });

    test("backslashes are refused", () => {
        // Browsers have historically normalised "\" to "/" in URLs, so "/\" and
        // "\\" can reach the same place as "//".
        expect(safeReturnPath("/\\evil.com")).toBe("/");
        expect(safeReturnPath("\\\\evil.com")).toBe("/");
        expect(safeReturnPath("/\\/evil.com")).toBe("/");
    });

    test("a scheme without slashes is refused", () => {
        expect(safeReturnPath("javascript:alert(1)")).toBe("/");
        expect(safeReturnPath("data:text/html,<script>")).toBe("/");
        expect(safeReturnPath("mailto:someone@example.com")).toBe("/");
    });

    test("a path not starting with a slash is refused", () => {
        // A relative path would resolve against whatever page it is used on,
        // which is not something this can reason about.
        expect(safeReturnPath("courses/abc")).toBe("/");
        expect(safeReturnPath("evil.com")).toBe("/");
    });

    test("leading whitespace and control characters do not smuggle a scheme", () => {
        // Browsers strip leading whitespace and some control characters before
        // parsing, so " https://evil.com" is still an absolute URL to them.
        expect(safeReturnPath("  https://evil.com")).toBe("/");
        expect(safeReturnPath("\n/\\evil.com")).toBe("/");
        expect(safeReturnPath("\t//evil.com")).toBe("/");
    });

    test("nothing supplied gives the homepage", () => {
        // The ordinary case: somebody opened /login directly.
        expect(safeReturnPath(null)).toBe("/");
        expect(safeReturnPath(undefined)).toBe("/");
        expect(safeReturnPath("")).toBe("/");
    });

    test("a repeated parameter gives the homepage rather than a guess", () => {
        // `?next=/a&next=/b` reaches a Next.js page as an array. Picking one of
        // the two would be inventing an answer.
        expect(safeReturnPath(["/a", "/b"])).toBe("/");
    });

    test("the homepage itself is a legitimate answer", () => {
        expect(safeReturnPath("/")).toBe("/");
    });
});
