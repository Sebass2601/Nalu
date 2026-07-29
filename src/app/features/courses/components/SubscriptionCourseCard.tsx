import Image from "next/image";
import Link from "next/link";
import { formatPlural } from "@/lib/formatters";
import type { SubscriptionCourse } from "../db/subscriptionCourses";

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
            className="flex h-full flex-col overflow-hidden rounded-2xl border border-yellow-200/40 bg-[#0a1628]/70 backdrop-blur-md transition-colors hover:border-yellow-200/80"
        >
            {/* Always present, image or not, so every card in a row is the
                same height and the strip keeps one baseline. */}
            <div className="relative aspect-video w-full">
                {course.imageUrl ? (
                    <Image
                        src={course.imageUrl}
                        alt={course.name}
                        fill
                        className="object-cover"
                    />
                ) : (
                    <TypographicCover name={course.name} />
                )}
            </div>

            <div className="flex flex-1 flex-col gap-2 p-4">
                {/* Clamped so a three-line name cannot push the meta line out
                    of alignment with the cards beside it. */}
                <h3 className="line-clamp-2 text-sm tracking-wide text-yellow-100">
                    {course.name}
                </h3>

                <p className="mt-auto text-xs tracking-widest text-yellow-200/50 uppercase">
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
            <span className="line-clamp-3 text-center text-xs tracking-[0.2em] text-yellow-200/80 uppercase">
                {name}
            </span>
        </div>
    );
}
