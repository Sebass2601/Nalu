import { Suspense, type ReactNode } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { and, asc, desc, eq, gt, inArray, lt } from "drizzle-orm";
import { cacheTag } from "next/cache";
import { CheckSquare2, ChevronLeft, ChevronRight, Lock, Square } from "lucide-react";
import { db } from "@/drizzle/db";
import {
    CourseSectionTable,
    ImageLessonTable,
    LessonTable,
    UserLessonCompleteTable,
} from "@/drizzle/schema";
import { getLessonIdTag } from "@/app/features/lessons/db/cache/lessons";
import { getUserLessonCompleteIdTag } from "@/app/features/lessons/db/cache/userLessonComplete";
import { updateLessonCompleteStatus } from "@/app/features/lessons/actions/userLessonComplete";
import { canUpdateUserLessonCompleteStatus } from "@/app/features/lessons/permissions/userLessonComplete";
import { LessonBody } from "@/app/features/lessons/components/LessonBody";
import {
    courseIsInSubscription,
    userHasCourseAccess,
} from "@/app/features/courses/db/courseAccess";
import { getCheapestPurchasableProductForCourse } from "@/app/features/products/db/products";
import { CheckoutButton } from "@/app/features/purchases/components/CheckoutButton";
import { productCtaClassName } from "@/app/features/purchases/components/productCtaStyles";
import { getCurrentUser } from "@/app/features/users/actions/currentUser";
import { ActionButton } from "@/components/ActionButton";

// A single lesson: the video or the writing, whether it has been finished, and
// the way through to the lessons on either side of it.
//
// The page, the background and the column it sits in all come from the course
// layout, which also draws the contents panel beside it — so this renders only
// the lesson itself. Prev/next below stay useful even with that panel on screen:
// they are the way to move on without breaking off to look something up.
//
// As everywhere else under Cache Components, `params` is request-time data, so
// the part that reads it sits inside <Suspense>.
export default function LessonPage({
    params,
}: {
    params: Promise<{ courseId: string; lessonId: string }>;
}) {
    return (
        <Suspense fallback={<LessonSkeleton />}>
            <Lesson params={params} />
        </Suspense>
    );
}

async function Lesson({
    params,
}: {
    params: Promise<{ courseId: string; lessonId: string }>;
}) {
    const { courseId, lessonId } = await params;
    const lesson = await getLesson(lessonId);

    if (lesson == null) return notFound();

    // The lesson id alone is enough to find the lesson, so the course id in the
    // URL could say anything. Checking it means the two halves of the address
    // always agree — otherwise the "back to course" links below would send
    // someone to a course this lesson was never part of.
    if (lesson.courseId !== courseId) return notFound();

    const { userId } = await getCurrentUser();

    // Viewing and completing are separate permissions. A `preview` lesson is
    // readable by anyone as a teaser — the product page already advertises it
    // as one — but progress is only recorded for people who actually have the
    // course, which is what `canUpdateUserLessonCompleteStatus` decides.
    const canView =
        lesson.status === "preview" ||
        (userId != null &&
            (await userHasCourseAccess({ userId, courseId })));

    const canComplete = await canUpdateUserLessonCompleteStatus(
        { userId },
        lesson.id
    );

    const isComplete =
        userId == null
            ? false
            : await getIsLessonComplete({ lessonId: lesson.id, userId });

    return (
        <article className="flex flex-col gap-6">
            <header className="flex flex-col gap-2">
                {/* Phone only. There the contents list is a separate screen this
                    one replaced, so there has to be a way back to it; on a wide
                    screen that list is still sitting alongside and never went
                    anywhere. */}
                <Link
                    href={`/courses/${courseId}`}
                    className="flex items-center gap-2 self-start text-sm tracking-widest text-yellow-200/70 uppercase transition-colors hover:text-yellow-100 lg:hidden"
                >
                    <ChevronLeft className="size-4" />
                    Contenido del curso
                </Link>
                <p className="text-xs tracking-widest text-yellow-200/60 uppercase">
                    {lesson.sectionName}
                </p>
                <h1 className="text-3xl tracking-wide text-yellow-100">
                    {lesson.name}
                </h1>
                {lesson.description && (
                    <p className="text-yellow-200/70">{lesson.description}</p>
                )}
            </header>

            {canView ? (
                <LessonBody
                    type={lesson.type}
                    youtubeVideoId={lesson.youtubeVideoId}
                    content={lesson.content}
                    images={lesson.images}
                    // Finishing the video IS finishing the lesson, so there is
                    // nothing to click. Left undefined once it is already
                    // complete, so rewatching cannot re-fire the action, and
                    // for anyone not entitled to record progress at all.
                    onVideoFinished={
                        !isComplete && canComplete
                            ? updateLessonCompleteStatus.bind(
                                  null,
                                  lesson.id,
                                  true
                              )
                            : undefined
                    }
                />
            ) : (
                <LockedLesson courseId={courseId} />
            )}

            <footer className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-yellow-200/20 pt-6">
                <Suspense fallback={<NavigationPlaceholder />}>
                    <ToLessonButton
                        lesson={lesson}
                        courseId={courseId}
                        lessonFunc={getPreviousLesson}
                        direction="previous"
                    >
                        Anterior
                    </ToLessonButton>
                </Suspense>

                {/* A written lesson has no moment that says "done", so the
                    reader says so themselves. It stays available on video
                    lessons too, both to undo an accidental completion and for
                    anyone who watched the video elsewhere. */}
                {canComplete && (
                    <ActionButton
                        action={updateLessonCompleteStatus.bind(
                            null,
                            lesson.id,
                            !isComplete
                        )}
                        variant="outline"
                        className="cursor-pointer border-yellow-200/60 bg-transparent text-yellow-200 uppercase tracking-widest hover:bg-yellow-200 hover:text-[#0a1628]"
                    >
                        <span className="flex items-center gap-2">
                            {isComplete ? (
                                <>
                                    <CheckSquare2 className="size-4" />
                                    Completada
                                </>
                            ) : (
                                <>
                                    <Square className="size-4" />
                                    Marcar completada
                                </>
                            )}
                        </span>
                    </ActionButton>
                )}

                <Suspense fallback={<NavigationPlaceholder />}>
                    <ToLessonButton
                        lesson={lesson}
                        courseId={courseId}
                        lessonFunc={getNextLesson}
                        direction="next"
                    >
                        Siguiente
                    </ToLessonButton>
                </Suspense>
            </footer>
        </article>
    );
}

// Shown in place of the lesson body to someone without the course. It names the
// way out rather than only refusing: the person reading it is, by definition,
// someone interested enough to have opened the lesson.
//
// There are two independent ways in, and a course can offer either, both, or
// neither: buying a product that bundles it, or subscribing while it is part of
// the subscription. Both are asked for, and every one that exists is offered —
// naming only one of two open doors would send some people the long way round.
async function LockedLesson({ courseId }: { courseId: string }) {
    // Independent questions, so they are asked at the same time rather than one
    // after the other. Both are cached reads.
    const [product, inSubscription] = await Promise.all([
        getCheapestPurchasableProductForCourse(courseId),
        courseIsInSubscription(courseId),
    ]);

    return (
        <div className="flex flex-col items-center gap-6 rounded-xl border border-yellow-200/40 bg-[#0a1628]/70 px-6 py-16 text-center backdrop-blur-md">
            <Lock className="size-12 text-yellow-200/60" />
            <p className="text-yellow-200/80">
                Esta lección está bloqueada. Necesitas acceso al curso para
                verla.
            </p>

            {product == null && !inSubscription ? (
                // Nothing to sell and nothing to join: the course is neither in
                // a product nor in the subscription. Rather than offer a way in
                // that does not exist, this goes back to the course itself,
                // where the preview lessons still are.
                <Link
                    href={`/courses/${courseId}`}
                    className="rounded-lg border border-yellow-200/60 px-6 py-2 text-sm tracking-widest text-yellow-200 uppercase transition-colors hover:bg-yellow-200 hover:text-[#0a1628]"
                >
                    Ver el curso
                </Link>
            ) : (
                // Stacked on a phone, side by side once there is room. Equal
                // columns because these are peers, not a recommendation and a
                // fallback — which of the two is the better deal depends on
                // whether someone wants this course or the whole library.
                <div className="flex w-full max-w-3xl flex-col items-stretch gap-6 sm:flex-row sm:items-start sm:justify-center sm:gap-8">
                    {product != null && (
                        <CheckoutButton
                            productId={product.id}
                            className="flex flex-1 flex-col items-center gap-2"
                        />
                    )}

                    {product != null && inSubscription && <OrDivider />}

                    {inSubscription && (
                        <div className="flex flex-1 flex-col items-center gap-2">
                            <Link
                                href="/subscribe"
                                className={productCtaClassName}
                            >
                                Suscribirme
                            </Link>
                            <p className="text-xs text-yellow-200/50">
                                Incluye este curso y todos los demás de la
                                suscripción.
                            </p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

// What separates the two ways into a course. A word rather than a number,
// because these are alternatives and not a sequence: "01 / 02" would tell the
// reader to do the first one and then the second.
//
// It turns with the layout it divides — a rule across the stack on a phone, a
// rule down the middle of the two columns on a wide screen — so the same mark
// means the same thing at both sizes.
function OrDivider() {
    return (
        <div
            aria-hidden
            className="flex items-center gap-3 sm:flex-col sm:self-stretch"
        >
            <span className="h-px flex-1 bg-yellow-200/20 sm:h-auto sm:w-px" />
            <span className="text-xs tracking-widest text-yellow-200/40 uppercase">
                o
            </span>
            <span className="h-px flex-1 bg-yellow-200/20 sm:h-auto sm:w-px" />
        </div>
    );
}

// One end of the prev/next pair. Renders nothing at the very first and very last
// lesson of a course, where there is nowhere further to go.
async function ToLessonButton({
    children,
    courseId,
    lesson,
    lessonFunc,
    direction,
}: {
    children: ReactNode;
    courseId: string;
    lesson: { id: string; sectionId: string; order: number };
    lessonFunc: (lesson: {
        id: string;
        sectionId: string;
        order: number;
    }) => Promise<{ id: string } | undefined>;
    direction: "previous" | "next";
}) {
    const toLesson = await lessonFunc(lesson);
    if (toLesson == null) return <NavigationPlaceholder />;

    const Icon = direction === "previous" ? ChevronLeft : ChevronRight;

    return (
        <Link
            href={`/courses/${courseId}/lessons/${toLesson.id}`}
            className="flex items-center gap-2 rounded-lg border border-yellow-200/60 px-5 py-2 text-sm tracking-widest text-yellow-200 uppercase transition-colors hover:bg-yellow-200 hover:text-[#0a1628]"
        >
            {direction === "previous" && <Icon className="size-4" />}
            {children}
            {direction === "next" && <Icon className="size-4" />}
        </Link>
    );
}

// Holds the space a navigation button would occupy, so the "mark complete"
// button stays put whether or not there is a lesson on either side.
function NavigationPlaceholder() {
    return <div className="h-9 w-28" />;
}

function LessonSkeleton() {
    return (
        <div className="flex animate-pulse flex-col gap-6">
            <div className="h-4 w-32 rounded bg-yellow-200/10" />
            <div className="h-9 w-80 rounded bg-yellow-200/20" />
            <div className="aspect-video w-full rounded-xl bg-[#0a1628]/40" />
        </div>
    );
}

// The lesson with everything needed to render it, including its pictures and the
// name of the section it sits in. Private lessons are excluded outright, so an
// unpublished lesson 404s rather than appearing locked.
async function getLesson(id: string) {
    "use cache";
    cacheTag(getLessonIdTag(id));

    const lesson = await db.query.LessonTable.findFirst({
        columns: {
            id: true,
            name: true,
            description: true,
            type: true,
            youtubeVideoId: true,
            content: true,
            status: true,
            sectionId: true,
            order: true,
        },
        where: and(
            eq(LessonTable.id, id),
            inArray(LessonTable.status, ["public", "preview"])
        ),
        with: {
            section: { columns: { name: true, courseId: true, status: true } },
            images: {
                columns: { id: true, url: true, caption: true },
                orderBy: asc(ImageLessonTable.order),
            },
        },
    });

    if (lesson == null) return null;

    // A lesson inside an unpublished section is not part of the course yet,
    // whatever the lesson's own status says.
    if (lesson.section.status !== "public") return null;

    const { section, ...rest } = lesson;

    return {
        ...rest,
        sectionName: section.name,
        courseId: section.courseId,
    };
}

async function getIsLessonComplete({
    userId,
    lessonId,
}: {
    userId: string;
    lessonId: string;
}) {
    "use cache";
    cacheTag(getUserLessonCompleteIdTag({ userId, lessonId }));

    const completion = await db.query.UserLessonCompleteTable.findFirst({
        columns: { lessonId: true },
        where: and(
            eq(UserLessonCompleteTable.userId, userId),
            eq(UserLessonCompleteTable.lessonId, lessonId)
        ),
    });

    return completion != null;
}

// The lesson before this one, looking inside the current section first and then
// stepping back into the previous section's last lesson. Both walks skip private
// sections and lessons, so navigation never lands on something unpublished.
async function getPreviousLesson(lesson: {
    sectionId: string;
    order: number;
}) {
    const withinSection = await db.query.LessonTable.findFirst({
        columns: { id: true },
        where: and(
            eq(LessonTable.sectionId, lesson.sectionId),
            lt(LessonTable.order, lesson.order),
            inArray(LessonTable.status, ["public", "preview"])
        ),
        orderBy: desc(LessonTable.order),
    });

    if (withinSection != null) return withinSection;

    const section = await db.query.CourseSectionTable.findFirst({
        columns: { order: true, courseId: true },
        where: eq(CourseSectionTable.id, lesson.sectionId),
    });

    if (section == null) return undefined;

    const previousSection = await db.query.CourseSectionTable.findFirst({
        columns: { id: true },
        where: and(
            eq(CourseSectionTable.courseId, section.courseId),
            lt(CourseSectionTable.order, section.order),
            eq(CourseSectionTable.status, "public")
        ),
        orderBy: desc(CourseSectionTable.order),
    });

    if (previousSection == null) return undefined;

    return db.query.LessonTable.findFirst({
        columns: { id: true },
        where: and(
            eq(LessonTable.sectionId, previousSection.id),
            inArray(LessonTable.status, ["public", "preview"])
        ),
        orderBy: desc(LessonTable.order),
    });
}

// The mirror image of the above: forwards within the section, then into the
// next section's first lesson.
async function getNextLesson(lesson: { sectionId: string; order: number }) {
    const withinSection = await db.query.LessonTable.findFirst({
        columns: { id: true },
        where: and(
            eq(LessonTable.sectionId, lesson.sectionId),
            gt(LessonTable.order, lesson.order),
            inArray(LessonTable.status, ["public", "preview"])
        ),
        orderBy: asc(LessonTable.order),
    });

    if (withinSection != null) return withinSection;

    const section = await db.query.CourseSectionTable.findFirst({
        columns: { order: true, courseId: true },
        where: eq(CourseSectionTable.id, lesson.sectionId),
    });

    if (section == null) return undefined;

    const nextSection = await db.query.CourseSectionTable.findFirst({
        columns: { id: true },
        where: and(
            eq(CourseSectionTable.courseId, section.courseId),
            gt(CourseSectionTable.order, section.order),
            eq(CourseSectionTable.status, "public")
        ),
        orderBy: asc(CourseSectionTable.order),
    });

    if (nextSection == null) return undefined;

    return db.query.LessonTable.findFirst({
        columns: { id: true },
        where: and(
            eq(LessonTable.sectionId, nextSection.id),
            inArray(LessonTable.status, ["public", "preview"])
        ),
        orderBy: asc(LessonTable.order),
    });
}
