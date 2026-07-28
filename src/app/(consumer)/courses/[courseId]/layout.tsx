import { Suspense } from "react";
import { notFound } from "next/navigation";
import { Cinzel } from "next/font/google";
import { CourseNav } from "@/app/features/courses/components/CourseNav";
import {
    getCompletedLessonIds,
    getCourseOutline,
} from "@/app/features/courses/db/courseOutline";
import { getCurrentUser } from "@/app/features/users/actions/currentUser";

const cinzel = Cinzel({ subsets: ["latin"] });

// The frame shared by a course and every lesson inside it: contents down one
// side, whatever you are reading down the other.
//
// It is a layout rather than a component each page renders, so moving between
// lessons leaves the contents panel alone — no reload, no scroll position lost,
// no flicker on a list that did not change.
//
// Nothing is awaited here on purpose. `params` is request-time data, and
// awaiting it in the layout itself would make the whole frame — background,
// column widths, the space the lesson occupies — wait for the request. The one
// part that genuinely needs it sits behind <Suspense> instead, and `children`
// carries its own boundaries.
// `LayoutProps` is generated from the directory structure and available
// globally without an import, which is how Next 16 wants layouts typed — it
// derives `params` from the route itself rather than trusting a hand-written
// shape that could drift from the folder name.
export default function CourseLayout({
    params,
    children,
}: LayoutProps<"/courses/[courseId]">) {
    return (
        <main
            className={`${cinzel.className} min-h-screen w-full bg-[#0a1628] bg-linear-to-b from-[#12243f] via-[#0d1c31] to-[#0a1628]`}
        >
            {/* Two columns side by side on a wide screen. On a phone they stack
                into one, and `order` on the children puts the lesson — or the
                course heading — above the contents list, which is the sequence
                you actually read them in. */}
            <div className="mx-auto flex max-w-7xl flex-col gap-8 px-4 pt-28 pb-16 lg:grid lg:max-w-7xl lg:grid-cols-[300px_1fr]">
                <Suspense fallback={<CourseNavSkeleton />}>
                    <CourseNavigation params={params} />
                </Suspense>
                <div className="order-1 min-w-0 lg:order-0">{children}</div>
            </div>
        </main>
    );
}

async function CourseNavigation({
    params,
}: {
    params: Promise<{ courseId: string }>;
}) {
    const { courseId } = await params;
    const course = await getCourseOutline(courseId);

    if (course == null) return notFound();

    // Signed-out visitors get the same contents list with nothing ticked. The
    // outline is public — the product page already shows it — and it is the
    // individual lesson that decides whether its body may be read.
    const { userId } = await getCurrentUser();
    const completedLessonIds =
        userId == null ? [] : await getCompletedLessonIds(userId);

    // A Set because this is asked once per lesson in the course, and `includes`
    // on an array would walk the whole list every time.
    const completed = new Set(completedLessonIds);

    return (
        <CourseNav
            courseId={course.id}
            courseName={course.name}
            sections={course.courseSections.map(section => ({
                ...section,
                lessons: section.lessons.map(lesson => ({
                    ...lesson,
                    isComplete: completed.has(lesson.id),
                })),
            }))}
        />
    );
}

function CourseNavSkeleton() {
    return (
        <div className="order-2 animate-pulse rounded-2xl border border-yellow-200/20 bg-[#0a1628]/40 p-4 lg:order-0 lg:sticky lg:top-28 lg:self-start">
            <div className="mb-4 h-6 w-40 rounded bg-yellow-200/20" />
            <div className="flex flex-col gap-3">
                {Array.from({ length: 4 }, (_, index) => (
                    <div
                        key={index}
                        className="h-4 w-full rounded bg-yellow-200/10"
                    />
                ))}
            </div>
        </div>
    );
}
