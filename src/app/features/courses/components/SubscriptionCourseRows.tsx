import Link from "next/link";
import {
    getSubscriptionCourseRows,
    UNCATEGORIZED_SLUG,
    type SubscriptionCategoryRow,
} from "../db/subscriptionCourses";
import { SubscriptionCourseCard } from "./SubscriptionCourseCard";

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
            <p className="text-center text-sm text-yellow-200/60">
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
// The strip scrolls with CSS alone — no client JavaScript, so it works before
// hydration and on any input a browser already handles. That costs one thing:
// a scrollable box is not reachable by keyboard unless it is focusable, hence
// `tabIndex`. Without it, arrow keys never reach the row and every card past
// the fold is unreachable without a mouse.
//
// The cut-off card at the container's right edge is the whole affordance. Do
// not add padding or a fade that hides it.
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
                    className="text-xl tracking-widest text-yellow-200"
                >
                    {row.categoryName}
                </h2>
                {/* On every row, including short ones. Made conditional, the
                    headings stop lining up down the page. */}
                <Link
                    href={`/subscribe/categories/${slug}`}
                    className="shrink-0 text-xs tracking-widest text-yellow-200/60 uppercase underline hover:text-yellow-200"
                >
                    Ver todos
                </Link>
            </div>

            <div
                tabIndex={0}
                role="group"
                aria-labelledby={headingId}
                className="flex snap-x snap-mandatory gap-4 overflow-x-auto px-1 pb-2"
            >
                {row.courses.slice(0, MAX_CARDS_PER_ROW).map(course => (
                    <div
                        key={course.id}
                        className="w-60 shrink-0 snap-start"
                    >
                        <SubscriptionCourseCard course={course} />
                    </div>
                ))}
            </div>
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
