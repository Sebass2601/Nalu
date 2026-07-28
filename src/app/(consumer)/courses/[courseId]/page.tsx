import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { FileText, Video } from "lucide-react";
import type { LessonType } from "@/drizzle/schema";
import {
    getCompletedLessonIds,
    getCourseOutline,
    getCourseProgress,
} from "@/app/features/courses/db/courseOutline";
import { getCurrentUser } from "@/app/features/users/actions/currentUser";
import { formatPlural } from "@/lib/formatters";

// The course's own landing page, sitting in the layout's content column beside
// the contents panel. It answers "what is this and where am I" — the navigating
// itself belongs to the panel, which is already on screen.
export default function CoursePage({
    params,
}: {
    params: Promise<{ courseId: string }>;
}) {
    return (
        <Suspense fallback={<CourseSkeleton />}>
            <CourseOverview params={params} />
        </Suspense>
    );
}

async function CourseOverview({
    params,
}: {
    params: Promise<{ courseId: string }>;
}) {
    const { courseId } = await params;
    const course = await getCourseOutline(courseId);

    if (course == null) return notFound();

    const lessonCount = course.courseSections.reduce(
        (total, section) => total + section.lessons.length,
        0
    );

    // Every lesson in the order a student meets them, sections included. Kept
    // flat because both things below are questions about that single sequence:
    // where the course starts, and where this student left off.
    //
    // Each one carries its section's name because the card that offers the next
    // lesson names where it sits — "Sección 2" is what tells someone returning
    // after a week whereabouts they are.
    const lessonsInOrder = course.courseSections.flatMap(section =>
        section.lessons.map(lesson => ({
            ...lesson,
            sectionName: section.name,
        }))
    );

    return (
        <article className="flex flex-col gap-6">
            <header className="flex flex-col gap-3">
                <h1 className="text-4xl tracking-wide text-yellow-100">
                    {course.name}
                </h1>
                <p className="text-sm tracking-widest text-yellow-200/70 uppercase">
                    {formatPlural(course.courseSections.length, {
                        singular: "sección",
                        plural: "secciones",
                    })}{" "}
                    ·{" "}
                    {formatPlural(lessonCount, {
                        singular: "lección",
                        plural: "lecciones",
                    })}
                </p>
                {/* Hidden on a phone, where this page is the contents list and
                    the space is better spent getting the next lesson and the
                    sections above the fold. */}
                <p className="hidden text-lg text-yellow-200/80 lg:block">
                    {course.description}
                </p>
            </header>

            {/* Its own boundary: progress depends on who is asking, which is
                request-time data, and the description above must not wait for
                it. The fallback is nothing — a signed-out visitor never sees a
                progress line at all, so a placeholder would be promising
                something that is not coming. */}
            <Suspense fallback={null}>
                <CourseProgress courseId={courseId} total={lessonCount} />
            </Suspense>

            {/* Also its own boundary, and for the same reason: where this
                button leads depends on what the person asking has finished.
                The fallback is a placeholder rather than the "Empezar" link,
                so nobody can click through to the first lesson in the moment
                before it becomes "Continuar" and points somewhere else. */}
            {lessonsInOrder.length > 0 && (
                <Suspense fallback={<StartButtonSkeleton />}>
                    <StartOrContinueButton
                        courseId={courseId}
                        lessonsInOrder={lessonsInOrder}
                    />
                </Suspense>
            )}

            {lessonCount === 0 && (
                <p className="text-yellow-200/70">
                    Este curso todavía no tiene lecciones publicadas.
                </p>
            )}
        </article>
    );
}

// The way into the course, pointed at wherever this student actually is.
//
// Three states, and the two that read "Empezar" are the same state in different
// clothes: someone who has not begun and someone who has finished are both
// standing at the front of the course with nothing half-done behind them.
// Between those, the button becomes "Continuar" and skips ahead.
async function StartOrContinueButton({
    courseId,
    lessonsInOrder,
}: {
    courseId: string;
    lessonsInOrder: {
        id: string;
        name: string;
        type: LessonType;
        sectionName: string;
    }[];
}) {
    const { userId } = await getCurrentUser();

    const completedLessonIds =
        userId == null ? [] : await getCompletedLessonIds(userId);
    const completed = new Set(completedLessonIds);

    // The first lesson WITHOUT a tick, rather than the one after the last tick.
    // Someone who jumped ahead has unfinished lessons behind them, and this
    // brings them back to the earliest one instead of carrying them past it.
    //
    // Undefined once every lesson is done, which is exactly the "finished"
    // state — and it falls back to the first lesson, so the button offers a
    // second run through rather than nothing at all.
    const resumeLesson = lessonsInOrder.find(lesson => !completed.has(lesson.id));
    const target = resumeLesson ?? lessonsInOrder[0];

    // "Continuar" only when picking up midway. A course not yet started has
    // nothing to continue, and a finished one is starting over.
    const isResuming =
        resumeLesson != null && resumeLesson.id !== lessonsInOrder[0].id;

    const href = `/courses/${courseId}/lessons/${target.id}`;
    const label = isResuming ? "Continuar" : "Empezar";
    const TypeIcon = target.type === "text" ? FileText : Video;

    return (
        <>
            {/* Phone: a card that names the lesson it opens. This screen is the
                contents list, so the one thing worth lifting out of it is where
                you are going next — and saying which lesson that is beats a bare
                button, because it is also the answer to "where was I". */}
            <div className="order-1 lg:hidden">
                <p className="mb-2 text-center text-xs tracking-widest text-yellow-200/50 uppercase">
                    {isResuming ? "Siguiente" : "Empieza aquí"}
                </p>
                <Link
                    href={href}
                    className="flex flex-col gap-3 rounded-xl border border-yellow-200/60 bg-[#0a1628]/70 p-4 backdrop-blur-md"
                >
                    <span className="text-lg tracking-wide text-yellow-100">
                        {target.name}
                    </span>
                    <span className="flex items-center gap-2 text-xs tracking-widest text-yellow-200/60 uppercase">
                        <TypeIcon className="size-3.5" />
                        {target.type === "text" ? "Lectura" : "Vídeo"}
                        <span aria-hidden>·</span>
                        <span className="truncate">{target.sectionName}</span>
                    </span>
                    <span className="self-start rounded-lg border border-yellow-200/60 px-5 py-2 text-sm tracking-widest text-yellow-200 uppercase">
                        {label}
                    </span>
                </Link>
            </div>

            {/* Wide screens keep the plain button: the contents list is already
                beside it naming every lesson, so a card repeating one of them
                would only say the same thing twice. */}
            <Link
                href={href}
                className="hidden self-start rounded-lg border border-yellow-200/60 px-8 py-4 text-lg tracking-widest text-yellow-200 uppercase transition-colors hover:bg-yellow-200 hover:text-[#0a1628] lg:inline-block"
            >
                {label}
            </Link>
        </>
    );
}

function StartButtonSkeleton() {
    return (
        <div className="h-15 w-48 animate-pulse self-start rounded-lg bg-yellow-200/10" />
    );
}

// "8 de 12 lecciones completadas", with a bar. Renders nothing for a visitor who
// is not signed in, and nothing for a course with no lessons, where a progress
// figure would be a division by zero dressed up as information.
async function CourseProgress({
    courseId,
    total,
}: {
    courseId: string;
    total: number;
}) {
    const { userId } = await getCurrentUser();
    if (userId == null || total === 0) return null;

    const completed = await getCourseProgress({ courseId, userId });
    const percent = Math.round((completed / total) * 100);

    return (
        <div className="flex flex-col gap-2">
            <p className="text-sm text-yellow-200/70">
                {/* formatPlural prefixes the count itself, so this reads
                    "8 de 12 lecciones completadas". */}
                {completed} de{" "}
                {formatPlural(total, {
                    singular: "lección completada",
                    plural: "lecciones completadas",
                })}
            </p>
            <div
                className="h-1.5 w-full max-w-md overflow-hidden rounded-full bg-yellow-200/15"
                role="progressbar"
                aria-valuenow={percent}
                aria-valuemin={0}
                aria-valuemax={100}
            >
                <div
                    className="h-full rounded-full bg-yellow-200 transition-[width]"
                    style={{ width: `${percent}%` }}
                />
            </div>
        </div>
    );
}

function CourseSkeleton() {
    return (
        <div className="flex animate-pulse flex-col gap-4">
            <div className="h-10 w-96 max-w-full rounded bg-yellow-200/20" />
            <div className="h-4 w-56 rounded bg-yellow-200/10" />
            <div className="h-20 w-full rounded bg-yellow-200/10" />
            <div className="mt-2 h-14 w-40 rounded-lg bg-yellow-200/10" />
        </div>
    );
}
