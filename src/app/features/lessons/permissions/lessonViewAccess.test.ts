import { describe, expect, test } from "vitest";
import { canViewLesson } from "./lessonViewAccess";

// The rule deciding whether a lesson's body and video are produced at all.
//
// Worth testing as a function of its own rather than left inline in the page:
// the same boolean gates the rendered body AND the minting of the signed video
// URL, so it is the whole of the access story for lesson content. A rule that
// load-bearing should be stateable in one place and readable in a test.
describe("canViewLesson", () => {
    test("a stranger sees nothing, whatever the lesson is", () => {
        // The change this file exists for. `preview` used to be readable by
        // anybody, and a free-content course let a signed-out visitor through
        // `userHasCourseAccess` before it ever looked at who was asking.
        expect(
            canViewLesson({
                isSignedIn: false,
                status: "preview",
                hasCourseAccess: true,
            })
        ).toBe(false);

        expect(
            canViewLesson({
                isSignedIn: false,
                status: "public",
                hasCourseAccess: true,
            })
        ).toBe(false);
    });

    test("being signed in is necessary but not sufficient", () => {
        // An account alone buys nothing: a public lesson in a course they have
        // no access to stays shut.
        expect(
            canViewLesson({
                isSignedIn: true,
                status: "public",
                hasCourseAccess: false,
            })
        ).toBe(false);
    });

    test("a signed-in visitor may read a preview lesson", () => {
        // What `preview` still means after the wall: a teaser for anyone with an
        // account, rather than for the whole internet.
        expect(
            canViewLesson({
                isSignedIn: true,
                status: "preview",
                hasCourseAccess: false,
            })
        ).toBe(true);
    });

    test("course access opens a public lesson", () => {
        expect(
            canViewLesson({
                isSignedIn: true,
                status: "public",
                hasCourseAccess: true,
            })
        ).toBe(true);
    });

    test("a private lesson stays shut even with course access", () => {
        // Unpublished work. `getPublishedLesson` should never hand one of these
        // to the page in the first place, so this is the belt to that braces:
        // if one ever arrives, the answer here is still no.
        expect(
            canViewLesson({
                isSignedIn: true,
                status: "private",
                hasCourseAccess: true,
            })
        ).toBe(false);
    });
});
