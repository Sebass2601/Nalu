import type { LessonStatus } from "@/drizzle/schema";

// Whether this viewer may read this lesson's body and watch its video.
//
// The single rule behind both, and that is why it is a function of its own
// rather than a boolean assembled in the page. The same answer decides what the
// page renders AND whether `getLessonVideoUrl` mints a signed R2 URL at all — so
// there is no second gate to keep in step with this one, and no way to close the
// page's version while leaving the video's open.
//
// Being signed in comes first and is checked for everybody. That is the whole of
// this change: before it, two separate doors let a stranger in. A `preview`
// lesson was readable by anyone as a public teaser, and a course marked
// `freeContent` returned true from `userHasCourseAccess` before that function
// ever looked at who was asking. Neither is a bug in those pieces — both were
// written to be open on purpose — so the wall goes here, where the two doors
// meet, rather than inside either of them. `userHasCourseAccess` in particular
// is also read by the course layout, the newsletter gallery and the product
// page, and tightening it there would gate things that were never meant to be.
//
// What `preview` still means afterwards: a teaser for anyone holding an account,
// rather than for the whole internet.
//
// `private` is refused explicitly even though `getPublishedLesson` already
// filters it out and the page 404s first. It costs a line, and it means this
// function is a complete statement of the rule rather than one that happens to
// be safe because of what a caller does elsewhere.
export function canViewLesson({
    isSignedIn,
    status,
    hasCourseAccess,
}: {
    isSignedIn: boolean;
    status: LessonStatus;
    // The answer from `userHasCourseAccess`, already awaited. Passed in rather
    // than looked up here so this stays a pure function of its inputs — which is
    // what lets the rule be read off a test instead of a database.
    hasCourseAccess: boolean;
}): boolean {
    if (!isSignedIn) return false;
    if (status === "private") return false;
    if (status === "preview") return true;

    return hasCourseAccess;
}
