import { Suspense } from "react";
import { notFound } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { getFreeCourseOutline } from "@/app/features/courses/db/freeCourse";
import { lessonNeighbours } from "@/app/features/courses/lib/freeCourseNeighbours";
import { getPublishedLesson } from "@/app/features/lessons/db/lessonDetail";
import { getLessonVideoUrl } from "@/app/features/lessons/lib/lessonVideoUrl";
import { LessonBody } from "@/app/features/lessons/components/LessonBody";
import { PlaqueButton } from "@/components/ui/PlaqueButton";

// One section of the free course: the video or the writing, and the way to the
// sections either side of it within the same class.
//
// The route segment is a *lesson* id — a "Sección" on the page. The folder is
// named for the table rather than for the label, so that nothing inside here has
// to keep translating between the two.
//
// What this page does not have, and why:
//
//   - no lock, and no purchase or subscription check. Every section of this
//     course is free to everyone, signed in or not, which is the entire point of
//     it. Being published is the only condition, and that is enforced by the
//     query rather than here;
//   - no "marcar completada", and no ticks in the menu. This page keeps no
//     record of who has read what.
//
// `params` is request-time data, so the part that reads it sits inside
// <Suspense> while the frame around it comes from the layout.
export default function FreeLessonPage({
    params,
}: PageProps<"/newsletter/[lessonId]">) {
    return (
        <Suspense fallback={<FreeLessonSkeleton />}>
            <FreeLesson params={params} />
        </Suspense>
    );
}

async function FreeLesson({
    params,
}: {
    params: PageProps<"/newsletter/[lessonId]">["params"];
}) {
    const { lessonId } = await params;

    // Both reads are cached, and neither depends on the other, so they are asked
    // for together rather than one after the other.
    const [course, lesson] = await Promise.all([
        getFreeCourseOutline(),
        getPublishedLesson(lessonId),
    ]);

    if (course == null || lesson == null) return notFound();

    // The outline is the membership test. Only the free course's own published
    // sections may be read through this route — otherwise /newsletter/<any id>
    // would be an unlocked door into every paid course in the catalogue, since
    // nothing else on this page checks entitlement.
    const currentClass = course.courseSections.find(navClass =>
        navClass.lessons.some(({ id }) => id === lessonId)
    );

    if (currentClass == null) return notFound();

    // Confined to this class on purpose. A class is one lesson cut into parts, so
    // the parts either side of this one are what "anterior" and "siguiente"
    // sensibly mean; the class published the week before is a different subject,
    // and walking into it by pressing the button once more would read as a
    // mistake. Moving between classes is the menu's job, where you can see what
    // you are picking.
    const { previous, next } = lessonNeighbours(currentClass.lessons, lessonId);

    // Minted here, at request time, and never inside a cached read: a signed URL
    // put into a `"use cache"` scope would be replayed to whoever asked next.
    // `canView` is unconditionally true because this course is free — the check
    // that matters happened above, when the section was found in the free
    // course's own outline.
    const videoUrl = await getLessonVideoUrl({
        canView: true,
        videoKey: lesson.videoKey,
    });

    return (
        <article className="flex flex-col gap-6">
            <header className="flex flex-col gap-2">
                <p className="text-sm tracking-widest text-ink-meta uppercase">
                    {currentClass.name}
                </p>
                <h1 className="text-4xl tracking-wide text-gold">
                    {lesson.name}
                </h1>
                {lesson.description && (
                    <p className="font-sans text-base leading-relaxed tracking-normal text-ink-body">
                        {lesson.description}
                    </p>
                )}
            </header>

            <LessonBody
                type={lesson.type}
                videoUrl={videoUrl}
                videoWidth={lesson.videoWidth}
                videoHeight={lesson.videoHeight}
                content={lesson.content}
                images={lesson.images}
                // Left off deliberately: finishing a video records progress in
                // the paid course, and there is no progress to record here.
            />

            {/* Two columns rather than a flex row with things pushed apart, so
                the buttons keep their positions at the edges of a class where one
                of the two does not exist — a column holds its width whether or
                not anything is in it. */}
            <footer className="mt-4 grid grid-cols-2 items-center gap-3 border-t border-gold/20 pt-6">
                <div className="justify-self-start">
                    {previous != null && (
                        <PlaqueButton
                            href={`/newsletter/${previous.id}`}
                            size="sm"
                        >
                            <span className="flex items-center justify-center gap-2">
                                <ChevronLeft aria-hidden className="size-4" />
                                Anterior
                            </span>
                        </PlaqueButton>
                    )}
                </div>

                <div className="justify-self-end">
                    {next != null && (
                        <PlaqueButton href={`/newsletter/${next.id}`} size="sm">
                            <span className="flex items-center justify-center gap-2">
                                Siguiente
                                <ChevronRight aria-hidden className="size-4" />
                            </span>
                        </PlaqueButton>
                    )}
                </div>
            </footer>
        </article>
    );
}

function FreeLessonSkeleton() {
    return (
        <div className="flex animate-pulse flex-col gap-6">
            <div className="h-4 w-32 rounded bg-gold/10" />
            <div className="h-9 w-80 max-w-full rounded bg-gold/20" />
            <div className="aspect-video w-full rounded-xl bg-[#0a1628]/40" />
        </div>
    );
}
