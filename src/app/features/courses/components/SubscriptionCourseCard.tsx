import Image from "next/image";
import Link from "next/link";
import { formatPlural } from "@/lib/formatters";
import type { SubscriptionCourse } from "../db/subscriptionCourses";
import { WeeklyContentTag } from "@/components/ui/WeeklyContentTag";

// One course inside the subscription band, and on the per-category pages.
//
// No price and no progress bar. Whoever is looking either has access already or
// is reading what an offer contains, and in neither case is a figure the point.
//
// The whole card is the link rather than carrying a button, because at this
// width a button costs a fifth of the card to repeat what the card says.
// `h-full` lets the card fill a stretched grid or flex track, so a long name
// never leaves its neighbours short.
export function SubscriptionCourseCard({
    course,
}: {
    course: SubscriptionCourse;
}) {
    return (
        <Link
            href={`/courses/${course.id}`}
            className="flex h-full flex-col overflow-hidden rounded-2xl border border-gold/40 bg-[#0a1628]/70 backdrop-blur-md transition-colors hover:border-gold/80"
        >
            {/* Always present, image or not, so every card in a row is the
                same height and the strip keeps one baseline. */}
            <div className="relative aspect-video w-full">
                {course.imageUrl ? (
                    <Image
                        src={course.imageUrl}
                        alt={course.name}
                        fill
                        // This card renders in two places: a fixed 240px
                        // (`w-60`) strip here in the row, and an
                        // `auto-fill, minmax(240px, 1fr)` grid on the
                        // per-category page. Without `sizes`, `fill` defaults
                        // to "100vw" and downloads a viewport-width image for
                        // a 240px slot. `auto-fill` always packs in as many
                        // 240px+gap tracks as fit, so above the `sm`
                        // breakpoint a grid cell never grows past roughly
                        // 240px + one gap — close enough to the row's fixed
                        // width to share one value. Below it, a narrow
                        // viewport collapses the grid to a single column that
                        // stretches toward the full container width, so the
                        // vw fallback covers that case without under-serving
                        // it; the row is still just 240px there, so it's
                        // mildly over-served rather than blurry.
                        sizes="(min-width: 640px) 240px, 90vw"
                        className="object-cover"
                    />
                ) : (
                    <TypographicCover name={course.name} />
                )}

                {/* Over the cover, image or not: this card always draws one, so
                    the tag has the same place on every card in a row. */}
                {course.uploadedWeekly && (
                    <WeeklyContentTag className="absolute right-2 bottom-2" />
                )}
            </div>

            <div className="flex flex-1 flex-col gap-2 p-4">
                {/* Clamped so a three-line name cannot push the meta line out
                    of alignment with the cards beside it. */}
                <h3 className="line-clamp-2 text-base tracking-wide text-ink-bright">
                    {course.name}
                </h3>

                <p className="mt-auto text-sm tracking-widest text-gold uppercase">
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
            </div>
        </Link>
    );
}

// The cover for a course with no artwork: its own name, set as type on the
// navy gradient. Not a stand-in for a missing picture — it carries the same
// thing a cover carries, which is why it is worth the space.
function TypographicCover({ name }: { name: string }) {
    return (
        <div className="flex h-full w-full items-center justify-center bg-linear-to-br from-[#16294a] via-[#0f1f38] to-[#0a1628] p-4">
            <span className="line-clamp-3 text-center text-sm tracking-[0.2em] text-ink-body uppercase">
                {name}
            </span>
        </div>
    );
}
