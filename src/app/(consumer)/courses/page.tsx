import { Suspense } from "react";
import { Cinzel } from "next/font/google";
import { getMyCourses } from "@/app/features/courses/db/myCourses";
import { MyCourseCard } from "@/app/features/courses/components/MyCourseCard";
import { getCurrentUser } from "@/app/features/users/actions/currentUser";
import { PlaqueButton } from "@/components/ui/PlaqueButton";
import { DraggableStrip } from "@/components/ui/DraggableStrip";

const cinzel = Cinzel({ subsets: ["latin"] });

// The shelf: everything this person can open — a grid on a wide screen, a
// dragged row on a phone.
//
// No category navigation, unlike the catalogue pages. Those pills exist to move
// around a shop with more in it than fits on a screen; here they would filter a
// list most people can count on one hand, and every category someone owns
// nothing in would be a pill leading to an empty page.
export default function MyCoursesPage() {
    return (
        <main
            className={`${cinzel.className} min-h-screen w-full bg-[#0a1628] bg-linear-to-b from-[#12243f] via-[#0d1c31] to-[#0a1628]`}
        >
            <div className="mx-auto max-w-6xl px-4 pt-32 pb-16">
                <h1 className="mb-8 text-center text-4xl tracking-widest text-gold">
                    Mis cursos
                </h1>

                {/* Everything below depends on who is asking, which is
                    request-time data, so the heading above renders immediately
                    and the shelf fills in. */}
                <Suspense fallback={<MyCoursesSkeleton />}>
                    <MyCourses />
                </Suspense>
            </div>
        </main>
    );
}

async function MyCourses() {
    const { userId } = await getCurrentUser();

    if (userId == null) return <SignedOut />;

    const courses = await getMyCourses(userId);

    if (courses.length === 0) return <Empty />;

    return (
        <>
            {/* Phone: a dragged row, not looping. A shelf is a finite thing and
                reaching its end is part of what it tells you — that these are
                the courses you have. */}
            <div className="lg:hidden">
                <DraggableStrip
                    label="Mis cursos"
                    previousLabel="Ver cursos anteriores"
                    nextLabel="Ver más cursos"
                >
                    {courses.map(course => (
                        // Nearly the full width of the screen, the size these
                        // cards were before the strip — but not quite all of
                        // it: the sliver of the next card showing past the
                        // edge is what says the row moves sideways. Capped so
                        // a large phone or a tablet does not stretch one card
                        // wider than the grid ever draws them.
                        <div
                            key={course.id}
                            className="w-[85vw] max-w-125 shrink-0 snap-start"
                        >
                            <MyCourseCard course={course} />
                        </div>
                    ))}
                </DraggableStrip>
            </div>

            <div className="hidden grid-cols-[repeat(auto-fill,minmax(300px,1fr))] gap-6 lg:grid">
                {courses.map(course => (
                    <MyCourseCard key={course.id} course={course} />
                ))}
            </div>
        </>
    );
}

// Nothing on the shelf yet. Both messages point at the catalogue rather than
// stopping at "you have none", because an empty shelf is the one moment where
// what to do next is the only useful thing to say.
function Empty() {
    return (
        <div className="flex flex-col items-center gap-4 text-center">
            <p className="text-gold-body">
                Todavía no tienes cursos. Cuando compres uno o empieces uno de
                tu suscripción, aparecerá aquí.
            </p>
            <CatalogueLink />
        </div>
    );
}

function SignedOut() {
    return (
        <div className="flex flex-col items-center gap-4 text-center">
            <p className="text-gold-body">
                Inicia sesión para ver tus cursos.
            </p>
            <div className="flex flex-wrap justify-center gap-3">
                <PlaqueButton href="/login">Iniciar sesión</PlaqueButton>
                <CatalogueLink />
            </div>
        </div>
    );
}

function CatalogueLink() {
    return (
        <PlaqueButton href="/products">Ver catálogo</PlaqueButton>
    );
}

// The shelf before it is known what is on it. Both of the layouts above, at the
// same breakpoint: the dragged row on a phone, the grid on a wide screen. A
// grid alone was a desktop-only fallback — on a phone it became a column of
// tall boxes that the horizontal row then replaced, and the page rearranged
// itself at the swap.
//
// Plain markup rather than a DraggableStrip. The strip mounts, measures and
// parks itself, and none of that is worth doing for cards about to be
// discarded; at rest it is a row clipped at the column's edge, which is all
// this has to look like.
function MyCoursesSkeleton() {
    return (
        <div className="animate-pulse">
            {/* The strip's own card width, so the sliver of the next card
                past the right edge is already there — a shelf holding one
                course and a shelf holding several look different from the
                first frame, and this one should not promise only one. */}
            <div className="flex gap-4 overflow-hidden px-1 pb-2 lg:hidden">
                {Array.from({ length: 3 }, (_, index) => (
                    <div key={index} className="w-[85vw] max-w-125 shrink-0">
                        <MyCourseCardSkeleton />
                    </div>
                ))}
            </div>

            <div className="hidden grid-cols-[repeat(auto-fill,minmax(300px,1fr))] gap-6 lg:grid">
                {Array.from({ length: 3 }, (_, index) => (
                    <MyCourseCardSkeleton key={index} />
                ))}
            </div>
        </div>
    );
}

// A MyCourseCard with nothing in it yet, block for block: cover, title, the
// size line, the progress bar and the button. Assembled rather than given a
// height, so it stays the height of the real card as that card changes.
//
// The cover is drawn even though `MyCourseCard` only draws one for a course
// that has art. It has to guess one way or the other, and the courses on a
// shelf are the ones someone bought or subscribed to — the ones most likely to
// carry a picture.
//
// The upgrade plaque is left out for the same kind of reason in the other
// direction: it appears on subscription cards only, so drawing it would add a
// button to every card on the shelf to be right about some of them.
function MyCourseCardSkeleton() {
    return (
        <div className="flex flex-col overflow-hidden rounded-2xl border border-yellow-200/40 bg-[#0a1628]/70">
            <div className="aspect-video w-full bg-yellow-200/10" />
            <div className="flex flex-1 flex-col gap-3 p-5">
                {/* Two lines, spaced as one wrapped heading rather than as two
                    separate blocks. */}
                <div className="space-y-2">
                    <div className="h-6 w-full rounded bg-yellow-200/20" />
                    <div className="h-6 w-2/3 rounded bg-yellow-200/20" />
                </div>
                {/* "1 clase · 3 secciones" */}
                <div className="h-5 w-40 rounded bg-yellow-200/10" />
                {/* The progress block: its line of text and its track, at the
                    gap the real one uses. */}
                <div className="flex flex-col gap-1.5">
                    <div className="h-5 w-48 rounded bg-yellow-200/10" />
                    <div className="h-1.5 w-full rounded-full bg-yellow-200/15" />
                </div>
                <div className="mt-auto h-9 w-full rounded bg-yellow-200/20" />
            </div>
        </div>
    );
}
