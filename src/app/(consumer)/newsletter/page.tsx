import { redirect } from "next/navigation";
import { getFreeCourseOutline } from "@/app/features/courses/db/freeCourse";
import { landingLessonId } from "@/app/features/courses/lib/freeCourseLanding";
import { FREE_COURSE_TITLE } from "@/app/features/courses/lib/freeCourseNames";

// The door into the free course. It has no content of its own: it works out where
// the course currently starts and sends the reader there, so /newsletter is an
// address that keeps pointing at the newest material as more is added.
//
// The redirect is what gives every section a URL of its own — shareable,
// reloadable, reachable with the back button — while the bare /newsletter link on
// the front page keeps meaning "the latest".
//
// The outline is awaited here, in the page itself, rather than inside a
// <Suspense> boundary — which is deliberate and load-bearing. `redirect` behaves
// differently depending on where it is called from: reached while the response is
// already streaming, it can only ask the browser to redirect itself, which it
// does by writing a `<meta http-equiv="refresh" content="1;...">` into the page —
// a full second of blank screen before anything happens. Called before the
// response has begun, it is a 307 and the browser never renders this page at all.
//
// Awaiting it up here is allowed because the outline is a cached read, not
// request-time data: there is no `params`, no cookie and no header on this route,
// so nothing forces the page to wait for a request to exist.
export default async function NewsletterPage() {
    const course = await getFreeCourseOutline();
    const lessonId =
        course == null ? null : landingLessonId(course.courseSections);

    // Outside any try/catch, as it must be: `redirect` works by throwing, and
    // catching it here would swallow the navigation.
    if (lessonId != null) redirect(`/newsletter/${lessonId}`);

    return <NothingPublishedYet />;
}

// Shown when there is no free course under the expected name, or when it exists
// but has nothing published in it yet.
//
// The two cases are deliberately not distinguished. To a visitor they are the
// same situation — there is nothing to read — and the difference between them is
// an administrative detail that would only be alarming to see written down.
function NothingPublishedYet() {
    return (
        <div className="flex flex-col items-center gap-4 py-24 text-center">
            {/* The same words as the plaque that leads here, from the same
                constant — arriving at a page whose heading does not match the
                thing you pressed reads as having ended up somewhere else. */}
            <h1 className="text-4xl tracking-wide text-ink-bright sm:text-5xl">
                {FREE_COURSE_TITLE}
            </h1>
            <p className="text-xl text-ink-body">
                No hay lecciones por ahora, ¡revisa esta página en el futuro!
            </p>
        </div>
    );
}
