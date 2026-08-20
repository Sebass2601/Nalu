import Image from "next/image";
import { formatPlural } from "@/lib/formatters";
import type { FreeClass } from "../db/freeClasses";
import { PlaqueButton } from "@/components/ui/PlaqueButton";
import { WeeklyContentTag } from "@/components/ui/WeeklyContentTag";
import { TypographicCover } from "./TypographicCover";

// One free class on /clases-gratuitas.
//
// Built on the same bones as `MyCourseCard` — cover, title, size, progress,
// plaque — and different from it in three ways, each of which follows from what
// this card is for:
//
//   - it always draws a cover, image or not. The shelf card omits the block when
//     there is no art, which is fine in a grid where every card starts at the
//     top of its own cell. Here the cards also sit in a strip, where one shorter
//     card reads as a mistake;
//   - the plaque says "Ver clase", not "Ver curso". A free course is one class by
//     convention, and calling it a course would promise more than is behind the
//     button;
//   - no upgrade offer. There is nothing to sell: the thing is already free.
//
// It still leads to /courses/[id] — the course's own page, with its contents
// list and its "Empezar"/"Continuar" — because that is where the class is read
// and where progress is recorded. This card is the way in, not a second reader.
export function FreeClassCard({ freeClass }: { freeClass: FreeClass }) {
    const isStarted = freeClass.completedCount > 0;

    return (
        <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-gold/40 bg-[#0a1628]/70 backdrop-blur-md">
            {/* Always present, image or not, so every card in the row is the
                same height and the strip keeps one baseline. */}
            <div className="relative aspect-video w-full">
                {freeClass.imageUrl ? (
                    <Image
                        src={freeClass.imageUrl}
                        alt={freeClass.name}
                        fill
                        // Two shapes, as with the subscription card: a card
                        // nearly the width of a phone in the strip, and a grid
                        // cell of about 300px on a wide screen. The grid is
                        // `auto-fill, minmax(300px, 1fr)`, so above `lg` a cell
                        // never grows far past 300px; below it the strip card
                        // is 85vw, which the vw fallback serves.
                        sizes="(min-width: 1024px) 300px, 85vw"
                        className="object-cover"
                    />
                ) : (
                    <TypographicCover name={freeClass.name} />
                )}

                {freeClass.uploadedWeekly && (
                    <WeeklyContentTag className="absolute right-2 bottom-2" />
                )}
            </div>

            <div className="flex flex-1 flex-col gap-3 p-5">
                <h2 className="text-xl tracking-wide text-ink-bright">
                    {freeClass.name}
                </h2>

                <ClassSize
                    sectionCount={freeClass.sectionCount}
                    lessonCount={freeClass.lessonCount}
                />

                {/* Only once there is progress to report. An untouched class
                    shows nothing here rather than an empty bar: a bar at zero
                    looks like something that stalled, when in fact it has not
                    been opened. */}
                {isStarted && (
                    <ClassProgressBar
                        completed={freeClass.completedCount}
                        total={freeClass.lessonCount}
                    />
                )}

                <PlaqueButton
                    href={`/courses/${freeClass.id}`}
                    // `mt-auto` so cards of differing heights in a row still
                    // line their plaques up along the bottom.
                    className="mt-auto block w-full"
                    size="sm"
                >
                    Ver clase
                </PlaqueButton>
            </div>
        </div>
    );
}

// How much is in this class.
//
// One Clase is the convention, and on a course that follows it the number is
// not worth saying: "1 clase · 4 secciones" spends half the line telling you
// the thing is singular. So a single-Clase course reports only its sections,
// and anything else falls back to the pair every other card in the app draws —
// which is what keeps this honest if an admin ever builds a larger free course.
function ClassSize({
    sectionCount,
    lessonCount,
}: {
    sectionCount: number;
    lessonCount: number;
}) {
    const secciones = formatPlural(lessonCount, {
        singular: "sección",
        plural: "secciones",
    });

    return (
        <p className="text-sm tracking-widest text-gold uppercase">
            {sectionCount > 1 && (
                <>
                    {formatPlural(sectionCount, {
                        singular: "clase",
                        plural: "clases",
                    })}
                    {" · "}
                </>
            )}
            {secciones}
        </p>
    );
}

function ClassProgressBar({
    completed,
    total,
}: {
    completed: number;
    total: number;
}) {
    // A class can hold completions against sections that were later
    // unpublished, which would put the figure above the total. Clamping keeps
    // the bar inside its track and the wording honest.
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
