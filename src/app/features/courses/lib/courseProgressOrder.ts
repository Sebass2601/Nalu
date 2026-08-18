// Where a course sits on a page that lists courses, given how far through it
// the reader is.
//
// Two pages ask this, for the same reason. A shelf of courses and a gallery of
// free classes are both piles of separate things, and the one fact that tells
// one reader's pile apart from another's is what they have already been
// through. So both open on whatever is half-read, the way a streaming service
// opens on "seguir viendo":
//
//   1. started, not finished — somewhere to pick up
//   2. untouched            — somewhere to begin
//   3. finished             — somewhere to go back to
//
// Finished sits below untouched rather than above it on purpose. Reaching the
// end of something is the one state that needs nothing further from the reader,
// so it is the last thing worth offering — but it is still offered, because a
// course can be worked through twice and hiding it would look like it had been
// taken away.
//
// What the two pages do NOT share is what happens inside a band, which is why
// there are two functions below rather than one. Both are pure and kept apart
// from the queries that feed them, because the rule has corners the queries do
// not — a course with nothing published in it, ticks left behind by an
// unpublished section — and those are worth pinning down in tests rather than
// reconstructing from an ORDER BY.

// What a band is worked out from. Anything else the card needs rides along,
// since a wider object still satisfies this and comes back unchanged.
type Progressed = {
    // Published lessons in the course. Zero is an ordinary state: a course
    // created but not yet filled, or one whose sections are all still private.
    lessonCount: number;
    // How many of them this reader has ticked. Always zero for a signed-out
    // visitor, which is what puts their whole page in the untouched band.
    completedCount: number;
};

// Lower sorts earlier. Numbers rather than an enum because they are only ever
// subtracted from one another.
const STARTED = 0;
const UNTOUCHED = 1;
const FINISHED = 2;

function band({ lessonCount, completedCount }: Progressed) {
    if (completedCount <= 0) return UNTOUCHED;

    // `lessonCount <= 0` first, so a course with nothing published in it can
    // never be called finished — 0 of 0 is arithmetically complete and means
    // the opposite of it. It cannot really be started either, since there is
    // nothing there to have started, and untouched is the honest answer for
    // something nobody could have read.
    if (lessonCount <= 0) return UNTOUCHED;

    // `>=` rather than `===`: a reader can hold more ticks than there are
    // lessons, once a lesson they finished is unpublished. The tick survives
    // the lesson, so anything at or past the total is finished.
    return completedCount >= lessonCount ? FINISHED : STARTED;
}

// The bands alone, leaving whatever order the caller already had inside each
// one. Used by "Mis cursos", which arrives sorted by name from SQL: `sort` is
// stable, so every band comes out alphabetical without this having to know that
// is what the shelf wants, or how to compare two names.
export function orderByProgressBand<T extends Progressed>(courses: T[]): T[] {
    // A copy: `sort` rearranges in place, and the array handed in may come from
    // a cached read that other callers share.
    return [...courses].sort((a, b) => band(a) - band(b));
}

// The bands, then newest first inside each one. Used by the free classes, which
// have no order of their own worth keeping — they are separate one-off classes
// rather than a named catalogue, so recency is the only thing left to sort them
// by once the bands are settled.
export function orderFreeClasses<T extends Progressed & { createdAt: Date }>(
    classes: T[]
): T[] {
    return [...classes].sort((a, b) => {
        const byBand = band(a) - band(b);
        if (byBand !== 0) return byBand;

        // Two classes made in the same moment compare equal, and `sort` is
        // stable, so they keep the order the query gave them instead of
        // swapping about between renders.
        return b.createdAt.getTime() - a.createdAt.getTime();
    });
}
