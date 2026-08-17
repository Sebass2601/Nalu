// Where /newsletter opens when nobody asked for a particular page.
//
// The free course is a running series rather than a syllabus worked through
// front to back: someone arriving has almost certainly come for whatever went
// up most recently, and no progress is stored anywhere to send them back to
// where they left off. So the newest class wins, and its first lesson is the
// way in.
//
// Vocabulary: a `courseSection` row is a "Clase" on the page and in the admin
// panel, and a `lesson` row is a "Sección". Table names are used here, as
// everywhere else in the codebase.
//
// Pure, and separate from the query that feeds it, because the rule has corners
// the query does not — an empty newest class, tied timestamps — and those are
// worth pinning down in tests rather than re-reading a `findFirst` to work out.

// Only the two things the choice turns on. Whatever else the caller selected
// comes along for free, since a wider object still satisfies this.
type CandidateSection = {
    createdAt: Date;
    lessons: { id: string }[];
};

// The lesson to open, or null when there is nothing published to open — a
// course with no classes yet, or one whose classes are all still empty.
//
// `sections` is expected in the admin's own order, which is the tiebreaker when
// two classes carry the same timestamp.
export function landingLessonId(sections: CandidateSection[]): string | null {
    let newest: CandidateSection | null = null;

    for (const section of sections) {
        // A class with nothing in it is not somewhere to land. It is the normal
        // state of a class between being created and being filled, and the
        // page has to stay on the previous week's material until then.
        if (section.lessons.length === 0) continue;

        // `>=` rather than `>`: on a tie the later entry replaces the earlier
        // one, so the class further down the admin's list wins.
        if (newest == null || section.createdAt >= newest.createdAt) {
            newest = section;
        }
    }

    return newest?.lessons[0]?.id ?? null;
}
