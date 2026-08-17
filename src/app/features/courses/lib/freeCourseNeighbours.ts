// The two ways out of a section of the free course, and where they stop.
//
// Both walks are confined to the class the reader is in. A class is one lesson
// broken into parts, so the parts either side of the one on screen are the
// useful pair; the class published before it is a different lesson entirely, and
// arriving there by pressing "Siguiente" one more time reads as an accident
// rather than as progress. Moving between classes is the lateral menu's job,
// where you can see what you are choosing.
//
// This is the one behaviour the free course does NOT share with a paid course,
// whose prev/next deliberately run across section boundaries to the end of the
// course — hence a separate function rather than a flag on that one.
//
// Pure, so the edges are settled here: both ends of a class, a class of one, and
// a lesson id that is not in the class at all.

// Whatever the caller has selected, narrowed to the one field this needs. The
// returned neighbours are the caller's own objects, so an id is all this has to
// know about them.
export function lessonNeighbours<Lesson extends { id: string }>(
    lessons: Lesson[],
    currentLessonId: string
): { previous: Lesson | null; next: Lesson | null } {
    const index = lessons.findIndex(lesson => lesson.id === currentLessonId);

    // Nothing to be adjacent to. A URL can name a lesson from another class —
    // or one that has since been unpublished — and neither end of this class is
    // a sensible answer to that.
    if (index === -1) return { previous: null, next: null };

    return {
        // `?? null` because indexing past either end gives undefined, and the
        // two absences — "no lesson there" and "never looked" — are the same
        // thing to the page drawing the buttons.
        previous: lessons[index - 1] ?? null,
        next: lessons[index + 1] ?? null,
    };
}
