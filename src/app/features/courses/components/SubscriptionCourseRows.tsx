import Link from "next/link";
import {
    getSubscriptionCourseRows,
    UNCATEGORIZED_SLUG,
    type SubscriptionCategoryRow,
} from "../db/subscriptionCourses";
import { SubscriptionCourseCard } from "./SubscriptionCourseCard";
import { DraggableStrip } from "@/components/ui/DraggableStrip";

// A row is a sampler, not a catalogue. Past this many, "Ver todos" is the way
// through — a strip nobody reaches the end of is worse than a shorter one.
const MAX_CARDS_PER_ROW = 12;

// The subscription library, one row per category, shown on both /subscription
// and /subscribe. Takes its own empty copy because the two pages are speaking
// to different people, even though the rows are identical.
export async function SubscriptionCourseRows({
    emptyMessage,
}: {
    emptyMessage: string;
}) {
    const rows = await getSubscriptionCourseRows();

    if (rows.length === 0) {
        return (
            <p className="text-center text-base text-gold-meta">
                {emptyMessage}
            </p>
        );
    }

    return (
        <div className="flex flex-col gap-12">
            {rows.map(row => {
                // Computed once so the list key and the row's own slug are
                // provably the same value, rather than two separate spots
                // that happen to derive it the same way today.
                const slug = row.categoryId ?? UNCATEGORIZED_SLUG;
                return <CourseRow key={slug} slug={slug} row={row} />;
            })}
        </div>
    );
}

// One category: its heading, its "Ver todos", and the strip.
//
// The strip itself is a client component: scrolling is still CSS, but mouse
// drag needs JavaScript. See `DraggableStrip` for what that costs.
function CourseRow({
    slug,
    row,
}: {
    slug: string;
    row: SubscriptionCategoryRow;
}) {
    const headingId = `subscription-row-${slug}`;

    return (
        <section className="flex flex-col gap-4">
            <div className="flex items-baseline justify-between gap-4 px-1">
                <h2
                    id={headingId}
                    className="text-2xl tracking-widest text-gold"
                >
                    {row.categoryName}
                </h2>
                {/* On every row, including short ones. Made conditional, the
                    headings stop lining up down the page. */}
                <Link
                    href={`/subscribe/categories/${slug}`}
                    className="shrink-0 text-sm tracking-widest text-gold-meta uppercase underline hover:text-gold"
                >
                    Ver todos
                </Link>
            </div>

            {/* The one place that loops. A row here is a sampler capped at
                MAX_CARDS_PER_ROW with "Ver todos" beside it for the rest, so
                its end is an arbitrary cut rather than the end of anything —
                nothing is lost by running past it back to the start. */}
            {/* No mouse dragging: on a desktop these rows are paged with the
                arrows and nothing else. Every card is a link, and pressing one
                to slide the row past it is a gesture that starts on top of the
                thing you might have meant to open. A finger still swipes the
                row, which is untouched by this — see `mouseDrag`. */}
            <DraggableStrip
                headingId={headingId}
                previousLabel="Ver cursos anteriores"
                nextLabel="Ver más cursos"
                mouseDrag={false}
                loop
            >
                {row.courses.slice(0, MAX_CARDS_PER_ROW).map(course => (
                    <div
                        key={course.id}
                        className="w-60 shrink-0 snap-start"
                    >
                        <SubscriptionCourseCard course={course} />
                    </div>
                ))}
            </DraggableStrip>
        </section>
    );
}

// Two rows of five is enough to hold the shape of the band while it loads.
export function SubscriptionCourseRowsSkeleton() {
    return (
        <div className="flex animate-pulse flex-col gap-12">
            {Array.from({ length: 2 }, (_, rowIndex) => (
                <div key={rowIndex} className="flex flex-col gap-4">
                    <div className="h-6 w-48 rounded bg-yellow-200/20" />
                    <div className="flex gap-4 overflow-hidden">
                        {Array.from({ length: 5 }, (_, cardIndex) => (
                            <div
                                key={cardIndex}
                                className="h-56 w-60 shrink-0 rounded-2xl border border-yellow-200/20 bg-[#0a1628]/40"
                            />
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
}
