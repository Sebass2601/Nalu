import { Suspense } from "react";
import Link from "next/link";
import { Cinzel } from "next/font/google";
import { getMyCourses } from "@/app/features/courses/db/myCourses";
import { MyCourseCard } from "@/app/features/courses/components/MyCourseCard";
import { getCurrentUser } from "@/app/features/users/actions/currentUser";

const cinzel = Cinzel({ subsets: ["latin"] });

// The shelf: everything this person can open, in one grid.
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
                <h1 className="mb-8 text-center text-3xl tracking-widest text-yellow-200">
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
        <div className="grid grid-cols-[repeat(auto-fill,minmax(300px,1fr))] gap-6">
            {courses.map(course => (
                <MyCourseCard key={course.id} course={course} />
            ))}
        </div>
    );
}

// Nothing on the shelf yet. Both messages point at the catalogue rather than
// stopping at "you have none", because an empty shelf is the one moment where
// what to do next is the only useful thing to say.
function Empty() {
    return (
        <div className="flex flex-col items-center gap-4 text-center">
            <p className="text-yellow-200/70">
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
            <p className="text-yellow-200/70">
                Inicia sesión para ver tus cursos.
            </p>
            <div className="flex flex-wrap justify-center gap-3">
                <Link
                    href="/login"
                    className="rounded-lg border border-yellow-200/60 px-6 py-2 text-sm tracking-widest text-yellow-200 uppercase transition-colors hover:bg-yellow-200 hover:text-[#0a1628]"
                >
                    Iniciar sesión
                </Link>
                <CatalogueLink />
            </div>
        </div>
    );
}

function CatalogueLink() {
    return (
        <Link
            href="/products"
            className="rounded-lg border border-yellow-200/60 px-6 py-2 text-sm tracking-widest text-yellow-200 uppercase transition-colors hover:bg-yellow-200 hover:text-[#0a1628]"
        >
            Ver catálogo
        </Link>
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
