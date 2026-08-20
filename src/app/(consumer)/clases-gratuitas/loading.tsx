import { cinzel } from "@/components/ui/fonts";
import { CarvedBackdrop } from "@/components/ui/CarvedBackdrop";
import { BackLink } from "@/components/ui/BackToHomeLink";
import { FreeClassesSkeleton } from "./FreeClassesSkeleton";
import { FREE_COURSE_TITLE } from "@/app/features/courses/lib/freeCourseNames";

// Shown while arriving at /clases-gratuitas from elsewhere on the site.
//
// The page's own <Suspense> covers the cards once this route is rendering; this
// covers the gap before that, when the browser has left the salon and nothing
// of the new page exists yet. Without it, pressing the plaque appears to do
// nothing for as long as the navigation takes.
//
// It draws the same wall, the same heading and the same card shapes as the page
// itself, so arriving is one continuous picture rather than two.
export default function LoadingFreeClasses() {
    return (
        <main className={`${cinzel.className} relative min-h-screen w-full`}>
            <CarvedBackdrop />

            <div className="mx-auto max-w-6xl px-4 pt-32 pb-16">
                {/* Real, not a grey bar. It goes to the same place whatever the
                    page turns out to hold, so there is no reason to make
                    somebody wait for it — and a way out is the one thing worth
                    having while everything else is still arriving. */}
                <BackLink href="/" className="mb-8">
                    Volver al salón
                </BackLink>

                <h1 className="mb-8 text-center text-4xl tracking-widest text-ink">
                    {FREE_COURSE_TITLE}
                </h1>

                <FreeClassesSkeleton />
            </div>
        </main>
    );
}
