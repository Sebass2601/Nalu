import Image from "next/image";
import { formatPlural } from "@/lib/formatters";
import type { MyCourse } from "../db/myCourses";
import { PlaqueButton } from "@/components/ui/PlaqueButton";
import { CourseUpgradeButton } from "./CourseUpgradeOffer";

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
// actually distinguish one course from another here — its name, its size, and
// how far through it you are.
export function MyCourseCard({ course }: { course: MyCourse }) {
    const isStarted = course.completedCount > 0;

    return (
        <div className="flex flex-col overflow-hidden rounded-2xl border border-gold/40 bg-[#0a1628]/70 backdrop-blur-md">
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
                <h2 className="text-xl tracking-wide text-ink-bright">
                    {course.name}
                </h2>

                <p className="text-sm tracking-widest text-ink-meta uppercase">
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
                    // `mt-auto` rather than a fixed margin: it takes over the
                    // job the description used to do as the card's flex filler,
                    // so cards of differing heights in a row still line their
                    // buttons up along the bottom.
                    className="mt-auto block w-full"
                    size="sm"
                >
                    Ver curso
                </PlaqueButton>

                {/* Only on a card that is here because of the subscription, and
                    only while something still sells it — see `upgradeProductId`.
                    Below "Ver curso" and in the quieter of the two plaque
                    variants, because opening the course is still what this card
                    is for; this is an offer, not the errand.
                    The button alone, with none of the copy it carries
                    elsewhere: a card is a summary, and this one already holds a
                    title, a size, a progress bar and another button before this
                    one arrives. The two places with
                    room to explain the offer — the course page and the product
                    page — still do. */}
                {course.upgradeProductId && (
                    <CourseUpgradeButton
                        productId={course.upgradeProductId}
                        // `sm` to match "Ver curso" above it — two plaques
                        // stacked in a card have to be the same size or the
                        // lower one reads as belonging to something else.
                        size="sm"
                        className="mt-2"
                        fullWidth
                        showDetails={false}
                    />
                )}
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
            <p className="text-sm text-ink-body">
                {done} de{" "}
                {formatPlural(total, {
                    singular: "sección completada",
                    plural: "secciones completadas",
                })}
            </p>
            <div
                className="h-1.5 w-full overflow-hidden rounded-full bg-gold/15"
                role="progressbar"
                aria-valuenow={percent}
                aria-valuemin={0}
                aria-valuemax={100}
            >
                <div
                    className="h-full rounded-full bg-gold"
                    style={{ width: `${percent}%` }}
                />
            </div>
        </div>
    );
}
