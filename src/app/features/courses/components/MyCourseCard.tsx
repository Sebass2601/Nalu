import Image from "next/image";
import { formatPlural } from "@/lib/formatters";
import type { MyCourse } from "../db/myCourses";
import { PlaqueButton } from "@/components/ui/PlaqueButton";

// One course on the shelf.
//
// A course may carry its own cover art, and when it does the card leads with it.
// When it does not, the card renders exactly as it always has — text-led, with
// nothing standing in for the missing picture. A shelf mixing the two looks
// uneven until every course has art, which is preferred to a placeholder that
// says nothing.
//
// What is never done is borrowing a picture from whichever product happens to
// bundle this course: that artwork sells the product, and the course is not the
// product. Absent its own image, the card leads instead with the things that
// actually distinguish one course from another here — its category, its size,
// and how far through it you are.
export function MyCourseCard({ course }: { course: MyCourse }) {
    const isStarted = course.completedCount > 0;

    return (
        <div className="flex flex-col overflow-hidden rounded-2xl border border-yellow-200/40 bg-[#0a1628]/70 backdrop-blur-md">
            {/* Structured exactly like ProductCard: the cover is its own
                full-bleed block flush against the card's top edge, and the
                padding lives on the text below rather than on the card. The
                card's own overflow-hidden is what rounds the image corners, so
                nothing here has to know the card's radius. */}
            {course.imageUrl && (
                <div className="relative aspect-video w-full">
                    <Image
                        src={course.imageUrl}
                        alt={course.name}
                        fill
                        className="object-cover"
                    />
                </div>
            )}

            <div className="flex flex-1 flex-col gap-3 p-5">
                {course.categoryName && (
                    <p className="text-sm tracking-widest text-gold-meta uppercase">
                        {course.categoryName}
                    </p>
                )}

                <h2 className="text-xl tracking-wide text-gold-bright">
                    {course.name}
                </h2>

                <p className="text-sm tracking-widest text-gold-meta uppercase">
                    {formatPlural(course.sectionCount, {
                        singular: "clase",
                        plural: "clases",
                    })}{" "}
                    ·{" "}
                    {formatPlural(course.lessonCount, {
                        singular: "sección",
                        plural: "secciones",
                    })}
                </p>

                <p className="line-clamp-3 flex-1 text-base text-gold-body">
                    {course.description}
                </p>

                {/* Only once there is progress to report. An untouched course
                    shows nothing here rather than an empty bar: a bar at zero
                    looks like a course that stalled, when in fact it has not
                    been opened. */}
                {isStarted && (
                    <CourseProgressBar
                        completed={course.completedCount}
                        total={course.lessonCount}
                    />
                )}

                <PlaqueButton
                    href={`/courses/${course.id}`}
                    className="mt-1 block w-full"
                    size="sm"
                >
                    Ver curso
                </PlaqueButton>
            </div>
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
            <p className="text-sm text-gold-body">
                {done} de{" "}
                {formatPlural(total, {
                    singular: "sección completada",
                    plural: "secciones completadas",
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
