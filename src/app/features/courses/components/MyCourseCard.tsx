import Link from "next/link";
import { formatPlural } from "@/lib/formatters";
import type { MyCourse } from "../db/myCourses";

// One course on the shelf.
//
// Text-led, with no cover image, because courses have none to show — unlike
// products, which are the thing being sold and carry artwork for it. Rather than
// borrow a picture from whichever product happens to bundle this course, the
// card leads with the things that actually distinguish one course from another
// here: its category, its size, and how far through it you are.
export function MyCourseCard({ course }: { course: MyCourse }) {
    const isStarted = course.completedCount > 0;

    return (
        <div className="flex flex-col gap-3 rounded-2xl border border-yellow-200/40 bg-[#0a1628]/70 p-5 backdrop-blur-md">
            {course.categoryName && (
                <p className="text-xs tracking-widest text-yellow-200/60 uppercase">
                    {course.categoryName}
                </p>
            )}

            <h2 className="text-lg tracking-wide text-yellow-100">
                {course.name}
            </h2>

            <p className="text-xs tracking-widest text-yellow-200/50 uppercase">
                {formatPlural(course.sectionCount, {
                    singular: "sección",
                    plural: "secciones",
                })}{" "}
                ·{" "}
                {formatPlural(course.lessonCount, {
                    singular: "lección",
                    plural: "lecciones",
                })}
            </p>

            <p className="line-clamp-3 flex-1 text-sm text-yellow-200/70">
                {course.description}
            </p>

            {/* Only once there is progress to report. An untouched course shows
                nothing here rather than an empty bar: a bar at zero looks like a
                course that stalled, when in fact it has not been opened. */}
            {isStarted && (
                <CourseProgressBar
                    completed={course.completedCount}
                    total={course.lessonCount}
                />
            )}

            <Link
                href={`/courses/${course.id}`}
                className="mt-1 block rounded-lg border border-yellow-200/60 px-4 py-2 text-center text-sm tracking-widest text-yellow-200 uppercase transition-colors hover:bg-yellow-200 hover:text-[#0a1628]"
            >
                Ver curso
            </Link>
        </div>
    );
}

function CourseProgressBar({
    completed,
    total,
}: {
    completed: number;
    total: number;
}) {
    // A course can hold completions against lessons that were later unpublished,
    // which would put the figure above the total. Clamping keeps the bar inside
    // its track and the wording honest.
    const done = Math.min(completed, total);
    const percent = total === 0 ? 0 : Math.round((done / total) * 100);

    return (
        <div className="flex flex-col gap-1.5">
            <p className="text-xs text-yellow-200/70">
                {done} de{" "}
                {formatPlural(total, {
                    singular: "lección completada",
                    plural: "lecciones completadas",
                })}
            </p>
            <div
                className="h-1.5 w-full overflow-hidden rounded-full bg-yellow-200/15"
                role="progressbar"
                aria-valuenow={percent}
                aria-valuemin={0}
                aria-valuemax={100}
            >
                <div
                    className="h-full rounded-full bg-yellow-200"
                    style={{ width: `${percent}%` }}
                />
            </div>
        </div>
    );
}
