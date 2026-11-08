import { Suspense } from "react";
import { cinzel } from "@/components/ui/fonts";
import { CarvedBackdrop } from "@/components/ui/CarvedBackdrop";
import { BackLink } from "@/components/ui/BackToHomeLink";
import { getFreeClasses } from "@/app/features/courses/db/freeClasses";
import { FreeClassCard } from "@/app/features/courses/components/FreeClassCard";
import { FREE_COURSE_TITLE } from "@/app/features/courses/lib/freeCourseNames";
import { getCurrentUser } from "@/app/features/users/actions/currentUser";
import { FreeClassesSkeleton } from "./FreeClassesSkeleton";
import { pageMetadata } from "@/lib/pageMetadata";

// The free classes: every course an admin has marked as free content, one card
// each.
//
// This page used to be a reader. It found one course by name, worked out its
// newest class and redirected into it, and drew the rest down the side in a
// menu. That shape only ever fitted a single running series; free content is
// now a set of separate one-off classes, and a gallery is what a set of
// separate things wants.
//
// Nothing is awaited out here. The wall and the heading are the same for
// everybody and are drawn immediately, while the cards — which depend on who is
// asking, because the order does — arrive behind their own boundary.
export const metadata = pageMetadata({
    path: "/clases-gratuitas",
    title: FREE_COURSE_TITLE,
    description:
        "Clases gratuitas de Nalu Escuela: crea tu cuenta y empieza a aprender numerología, tarot y saberes holísticos sin pagar nada.",
});

export default function FreeClassesPage() {
    return (
        // No background of its own, which is what lets the carved wall show
        // through: CarvedBackdrop paints at `-z-10`, and a negative-z-index
        // descendant is painted before the in-flow backgrounds above it, so any
        // opaque colour here would land on top and hide it.
        <main className={`${cinzel.className} relative min-h-screen w-full`}>
            <CarvedBackdrop />

            <div className="mx-auto max-w-6xl px-4 pt-32 pb-16">
                {/* Back to the salon, which is where the plaque that leads
                    here lives. In the flow above the heading rather than pinned
                    to a corner, the way the catalogue pages carry theirs.

                    This is the way out the side menu used to provide, before
                    /clases-gratuitas stopped being a reader with a frame around it —
                    a gallery has no menu to hang it off, so the page carries it
                    itself. */}
                <BackLink href="/" className="mb-8">
                    Volver al salón
                </BackLink>

                {/* The same words as the plaque that leads here, from the same
                    constant — arriving at a page whose heading does not match
                    the thing you pressed reads as having ended up somewhere
                    else. */}
                <h1 className="mb-8 text-center text-4xl tracking-widest text-ink">
                    {FREE_COURSE_TITLE}
                </h1>

                <Suspense fallback={<FreeClassesSkeleton />}>
                    <FreeClasses />
                </Suspense>
            </div>
        </main>
    );
}

async function FreeClasses() {
    // Nullable on purpose, and never a reason to turn anyone away. These
    // classes are free to everyone; who is asking only decides what order they
    // come in and whether any progress bars are drawn.
    const { userId } = await getCurrentUser();
    const classes = await getFreeClasses(userId);

    if (classes.length === 0) return <NothingPublishedYet />;

    return (
        /* The same grid as "Mis cursos", at every width. On a phone `auto-fill`
           with a 300px minimum resolves to a single column, so the classes are
           a plain stack of full-width cards moved by scrolling the page — the
           same gesture that reaches everything else on it. */
        <div className="grid grid-cols-[repeat(auto-fill,minmax(300px,1fr))] gap-4 lg:gap-6">
            {classes.map(freeClass => (
                <FreeClassCard key={freeClass.id} freeClass={freeClass} />
            ))}
        </div>
    );
}

// Shown when no course is marked as free content, and when the ones that are
// hold nothing published yet.
//
// The two cases are deliberately not distinguished. To a visitor they are the
// same situation — there is nothing to read — and the difference between them
// is an administrative detail that would only be alarming to see written down.
function NothingPublishedYet() {
    return (
        <p className="py-16 text-center text-xl text-ink-body">
            No hay lecciones por ahora, ¡revisa esta página en el futuro!
        </p>
    );
}
