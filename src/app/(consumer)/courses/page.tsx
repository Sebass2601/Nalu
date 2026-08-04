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

function MyCoursesSkeleton() {
    return (
        <div className="grid animate-pulse grid-cols-[repeat(auto-fill,minmax(300px,1fr))] gap-6">
            {Array.from({ length: 3 }, (_, index) => (
                <div
                    key={index}
                    className="h-64 w-full rounded-2xl border border-yellow-200/20 bg-[#0a1628]/40"
                />
            ))}
        </div>
    );
}
