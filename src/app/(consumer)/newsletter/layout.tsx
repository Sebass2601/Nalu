import { Suspense } from "react";
import { cinzel } from "@/components/ui/fonts";
import { CarvedBackdrop } from "@/components/ui/CarvedBackdrop";
import { SideMenuFrame } from "@/components/ui/SideMenuFrame";
import { FreeCourseNav } from "@/app/features/courses/components/FreeCourseNav";
import { getFreeCourseOutline } from "@/app/features/courses/db/freeCourse";

// The frame shared by the free course and every section inside it: the menu of
// classes down the left, whatever is being read beside it.
//
// A layout rather than something each page draws for itself, and that is the
// whole reason the menu behaves the way it does. A layout is not re-rendered
// when you move between the pages inside it, so choosing a section leaves the
// menu alone — still open on a wide screen, still scrolled where you left it,
// no flicker on a list that did not change.
//
// Nothing is awaited here. The background and the columns are the same for every
// section, so they are drawn immediately; the two things that do need data — the
// list of classes, and the section itself — arrive separately behind their own
// boundaries.
export default function NewsletterLayout({
    children,
}: LayoutProps<"/newsletter">) {
    return (
        // No background of its own, which is what lets the carved wall show
        // through. CarvedBackdrop paints at `-z-10`, and a negative-z-index
        // descendant is painted before the in-flow backgrounds above it — so any
        // opaque colour here would land on top and hide it entirely. The canvas
        // navy still comes from <body>, which is what fills an overscroll bounce
        // where a fixed layer cannot reach.
        <main
            className={`${cinzel.className} relative min-h-screen w-full`}
        >
            <CarvedBackdrop />

            <SideMenuFrame
                menuLabel="Clases"
                // Passed as a prop rather than nested inside `children` so the
                // two are independent: the section someone asked for is not held
                // up by the query that lists every class, and vice versa.
                menu={
                    <Suspense fallback={<MenuSkeleton />}>
                        <FreeCourseMenu />
                    </Suspense>
                }
            >
                {children}
            </SideMenuFrame>
        </main>
    );
}

// The class list, fetched once for the whole route. `createdAt` is dropped here
// rather than sent onwards: the menu draws names and links, and the timestamp
// only exists to decide where /newsletter opens.
async function FreeCourseMenu() {
    const course = await getFreeCourseOutline();

    // No course under that name yet. The page's own empty state explains the
    // situation; the menu has nothing to add to it, and a heading over an empty
    // list would read as a fault.
    if (course == null) return null;

    return (
        <FreeCourseNav
            classes={course.courseSections.map(({ id, name, lessons }) => ({
                id,
                name,
                lessons,
            }))}
        />
    );
}

function MenuSkeleton() {
    return (
        <div className="animate-pulse">
            <div className="mb-4 h-6 w-40 rounded bg-gold/20" />
            <div className="flex flex-col gap-3">
                {Array.from({ length: 4 }, (_, index) => (
                    <div key={index} className="h-4 w-full rounded bg-gold/10" />
                ))}
            </div>
        </div>
    );
}
