"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { Check, FileText, Video } from "lucide-react";
import type { LessonType } from "@/drizzle/schema";

type NavLesson = {
    id: string;
    name: string;
    type: LessonType;
    isComplete: boolean;
    // Already weighed against this visitor's access by the layout: true only
    // when the lesson is a preview AND they have no other way into it.
    isPreview: boolean;
};

type NavSection = {
    id: string;
    name: string;
    lessons: NavLesson[];
};

// The course's contents: every section, every lesson inside it, which ones are
// done and which one is open.
//
// It behaves as two different things depending on the width of the screen, and
// `useParams` is what lets one component be both. On a wide screen it is a
// sidebar standing beside whatever you are reading. On a phone there is no room
// for that, so the contents and the lesson become separate screens the way they
// do in a phone app: the course page IS the list, and opening a lesson replaces
// it entirely. Knowing whether a lesson is open is what decides which.
//
// A client component for that same reason — the lesson id lives in the URL of
// the *page*, and a layout renders above the page, so the server cannot see it.
//
// The expanding itself is a plain <details>, not an accordion library: the
// browser already does this, it survives a missing JavaScript bundle, and the
// product page's syllabus is built the same way.
export function CourseNav({
    courseId,
    courseName,
    sections,
}: {
    courseId: string;
    courseName: string;
    sections: NavSection[];
}) {
    const params = useParams();
    const currentLessonId =
        typeof params.lessonId === "string" ? params.lessonId : null;

    // A lesson in the URL means a lesson is filling the screen — which on a
    // phone is the whole screen, leaving no room for this list.
    const isLessonOpen = currentLessonId != null;

    // The section holding the lesson being read opens on arrival. With no lesson
    // open — the course's own page — the first section opens instead, so the
    // panel never starts as a wall of closed headings.
    const openSectionId =
        sections.find(section =>
            section.lessons.some(lesson => lesson.id === currentLessonId)
        )?.id ??
        sections[0]?.id ??
        null;

    return (
        // On a phone, a lesson takes the whole screen and this steps out of the
        // way — the back arrow in the lesson brings it back. On a wide screen it
        // is always present, because there it costs nothing and losing your
        // place in a long course costs a lot.
        //
        // `order` puts the list below the course heading and its Up Next card on
        // a phone, matching the order you read them in, and is reset at lg where
        // the grid places it in the left column instead.
        <div
            className={`order-2 rounded-2xl border border-gold/40 bg-[#0a1628]/70 p-4 backdrop-blur-md lg:order-0 lg:sticky lg:top-32 lg:self-start ${
                isLessonOpen ? "hidden lg:block" : ""
            }`}
        >
            {/* Only on wide screens. On a phone this list is the course page,
                whose own heading already names the course directly above it.

                While a lesson is open the name is the way back out to the
                course — the one page the contents panel cannot otherwise reach,
                since every row in it leads to another lesson. On the course
                page itself it stays plain text: a link to the page you are
                already on is a link that does nothing. */}
            {isLessonOpen ? (
                <Link
                    href={`/courses/${courseId}`}
                    className="mb-4 hidden text-xl tracking-wide text-ink-bright transition-colors hover:text-ink lg:block"
                >
                    {courseName}
                </Link>
            ) : (
                <p className="mb-4 hidden text-xl tracking-wide text-ink-bright lg:block">
                    {courseName}
                </p>
            )}

            <nav aria-label="Contenido del curso" className="flex flex-col">
                {sections.map(section => (
                    <details
                        key={section.id}
                        open={section.id === openSectionId}
                        className="group border-t border-gold/20 py-2 first:border-t-0"
                    >
                        <summary className="flex cursor-pointer list-none items-center justify-between gap-2 text-base text-ink-bright [&::-webkit-details-marker]:hidden">
                            <span>{section.name}</span>
                            <span className="text-sm text-ink-meta transition-transform group-open:rotate-90">
                                ›
                            </span>
                        </summary>

                        <ul className="mt-2 flex flex-col gap-1">
                            {section.lessons.map(lesson => (
                                <li key={lesson.id}>
                                    <LessonLink
                                        courseId={courseId}
                                        lesson={lesson}
                                        isCurrent={lesson.id === currentLessonId}
                                    />
                                </li>
                            ))}
                        </ul>
                    </details>
                ))}
            </nav>
        </div>
    );
}

function LessonLink({
    courseId,
    lesson,
    isCurrent,
}: {
    courseId: string;
    lesson: NavLesson;
    isCurrent: boolean;
}) {
    const Icon = lesson.type === "text" ? FileText : Video;

    return (
        <Link
            href={`/courses/${courseId}/lessons/${lesson.id}`}
            // The lesson being read is marked two ways, not just by colour:
            // `aria-current` says so to a screen reader, and the filled
            // background says so to everyone else.
            aria-current={isCurrent ? "page" : undefined}
            className={`flex items-center gap-2 rounded-lg px-2 py-1.5 text-base transition-colors ${
                isCurrent
                    ? "bg-gold/15 text-ink-bright"
                    : "text-ink-body hover:bg-gold/10 hover:text-ink-bright"
            }`}
        >
            <Icon className="size-3.5 shrink-0 text-ink-meta" />
            <span className="flex-1">{lesson.name}</span>
            {/* The same badge the product page's syllabus carries, so a lesson
                advertised as watchable there is recognisable here. `shrink-0`
                keeps it whole: the name beside it is the flexible one, and a
                badge broken across two lines reads as a second lesson. */}
            {lesson.isPreview && (
                <span className="shrink-0 rounded border border-gold/50 px-2 py-0.5 text-xs tracking-widest text-ink uppercase">
                    Vista previa
                </span>
            )}
            {lesson.isComplete && (
                <Check
                    // Gold rather than the row's white. A tick is not something
                    // you read, it is a mark against the row — and in a list
                    // where every lesson name is already white, a white tick is
                    // one more white thing to scan past. The gold is what lets
                    // you count the finished lessons without reading any of it.
                    className="size-3.5 shrink-0 text-gold"
                    aria-label="Completada"
                />
            )}
        </Link>
    );
}
