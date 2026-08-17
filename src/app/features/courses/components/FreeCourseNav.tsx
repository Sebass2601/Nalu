"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { FileText, Video } from "lucide-react";
import type { LessonType } from "@/drizzle/schema";
import { useSideMenu } from "@/components/ui/SideMenuFrame";
import { FREE_COURSE_TITLE } from "../lib/freeCourseNames";

// A "Sección" on the page — a `lesson` row underneath.
type NavLesson = {
    id: string;
    name: string;
    type: LessonType;
};

// A "Clase" on the page — a `courseSection` row underneath.
type NavClass = {
    id: string;
    name: string;
    lessons: NavLesson[];
};

// What the free course contains: every class, and the sections inside whichever
// one is open.
//
// Nothing about progress appears here, unlike the paid course's contents panel —
// no ticks, no counts. This page keeps no record of who has read what, so a
// column of empty checkboxes would be promising something that never fills in.
//
// A client component for the same reason the paid course's panel is one: the id
// of the section being read lives in the URL of the *page*, and this is rendered
// from the layout above it, which cannot see that. `useParams` can.
//
// The expanding is a plain <details>, matching the paid course's panel and the
// product page's syllabus: the browser already does this, and it keeps working
// with no JavaScript at all.
export function FreeCourseNav({ classes }: { classes: NavClass[] }) {
    const params = useParams();
    const currentLessonId =
        typeof params.lessonId === "string" ? params.lessonId : null;

    // Closing the menu on a phone is the frame's business, not this list's —
    // this only reports that a row was used.
    const { onNavigate } = useSideMenu();

    // The class holding the section being read is the one that stands open.
    // Because this is derived from the URL rather than from state, it follows
    // the reader: arriving at a section from anywhere — a link, a reload, the
    // back button — opens the class around it without anything having to
    // remember that it should.
    const currentClassId =
        classes.find(navClass =>
            navClass.lessons.some(lesson => lesson.id === currentLessonId)
        )?.id ?? null;

    return (
        <nav aria-label="Clases del curso gratis" className="flex flex-col">
            {/* The title visitors know this by, not the course row's name. The
                row is named separately so it is recognisable in the admin panel's
                list of courses; that name is for whoever edits it, and never
                appears on the page. Both strings live in `lib/freeCourseNames`. */}
            <p className="mb-4 text-xl tracking-wide text-ink-bright">
                {FREE_COURSE_TITLE}
            </p>

            {classes.length === 0 ? (
                <p className="font-sans text-sm leading-relaxed tracking-normal text-ink-meta">
                    Aún no hay clases publicadas.
                </p>
            ) : (
                classes.map(navClass => {
                    const isCurrentClass = navClass.id === currentClassId;

                    return (
                        <details
                            key={navClass.id}
                            open={isCurrentClass}
                            className="group border-t border-gold/20 py-2 first:border-t-0"
                        >
                            {/* The class being read is filled with gold and its
                                name goes pure white, while every other class
                                stays unfilled — so which class you are inside is
                                readable at a glance, even with several open.

                                The fill is gold over the navy rather than solid
                                gold: white on solid gold is barely readable, and
                                the name is the part that has to be read. */}
                            <summary
                                className={`flex cursor-pointer list-none items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-base transition-colors [&::-webkit-details-marker]:hidden ${
                                    isCurrentClass
                                        ? "border-l-2 border-gold bg-gold/25 text-white"
                                        : "text-ink-bright hover:bg-gold/10"
                                }`}
                            >
                                <span>{navClass.name}</span>
                                <span
                                    aria-hidden
                                    className="text-sm text-ink-meta transition-transform group-open:rotate-90"
                                >
                                    ›
                                </span>
                            </summary>

                            <ul className="mt-2 flex flex-col gap-1 pl-2">
                                {navClass.lessons.map(lesson => {
                                    const Icon =
                                        lesson.type === "text"
                                            ? FileText
                                            : Video;
                                    const isCurrent =
                                        lesson.id === currentLessonId;

                                    return (
                                        <li key={lesson.id}>
                                            <Link
                                                href={`/newsletter/${lesson.id}`}
                                                onClick={onNavigate}
                                                // Marked to a screen reader as
                                                // well as to the eye: colour
                                                // alone is not an answer to
                                                // "which one am I on".
                                                aria-current={
                                                    isCurrent
                                                        ? "page"
                                                        : undefined
                                                }
                                                className={`flex items-center gap-2 rounded-lg px-2 py-1.5 text-base transition-colors ${
                                                    isCurrent
                                                        ? "bg-gold/15 text-white"
                                                        : "text-ink-body hover:bg-gold/10 hover:text-ink-bright"
                                                }`}
                                            >
                                                <Icon
                                                    aria-hidden
                                                    className="size-3.5 shrink-0 text-ink-meta"
                                                />
                                                <span className="flex-1">
                                                    {lesson.name}
                                                </span>
                                            </Link>
                                        </li>
                                    );
                                })}

                                {navClass.lessons.length === 0 && (
                                    <li className="px-2 font-sans text-sm text-ink-meta">
                                        Todavía sin secciones.
                                    </li>
                                )}
                            </ul>
                        </details>
                    );
                })
            )}
        </nav>
    );
}
