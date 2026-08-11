import { Suspense } from "react";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Cinzel } from "next/font/google";
import { and, asc, eq, inArray } from "drizzle-orm";
import { cacheTag } from "next/cache";
import { ChevronRight, FileText, Video } from "lucide-react";
import { db } from "@/drizzle/db";
import {
    CourseSectionTable,
    LessonTable,
    ProductTable,
    type LessonType,
} from "@/drizzle/schema";
import { getProductIdTag } from "@/app/features/products/db/cache/products";
import { getCourseIdTag } from "@/app/features/courses/db/cache/courses";
import { getCourseSectionCourseTag } from "@/app/features/CourseSections/db/cache/courseSections";
import { getLessonCourseTag } from "@/app/features/lessons/db/cache/lessons";
import {
    ProductPrice,
    FullPrice,
} from "@/app/features/products/components/ProductPrice";
import {
    ProductCallToAction,
    ProductCallToActionSkeleton,
} from "@/app/features/purchases/components/ProductCallToAction";
import { PlaqueButton } from "@/components/ui/PlaqueButton";
import { BackLink } from "@/components/ui/BackToHomeLink";
import { formatPlural } from "@/lib/formatters";

const cinzel = Cinzel({ subsets: ["latin"] });

// Everything a buyer sees before purchasing: the price, what the product is,
// how much material it contains, and the full syllabus of every course it
// bundles broken down into sections and lessons.
//
// As on the category page, `params` is only known at request time under Cache
// Components, so the part that reads it sits inside <Suspense>.
export default function ProductPage({
    params,
}: {
    params: Promise<{ productId: string }>;
}) {
    return (
        <main
            className={`${cinzel.className} min-h-screen w-full bg-[#0a1628] bg-linear-to-b from-[#12243f] via-[#0d1c31] to-[#0a1628]`}
        >
            <div className="pt-32 px-4 max-w-6xl mx-auto pb-16">
                {/* Outside the boundary below, and above everything the
                    product itself draws. Where it goes does not depend on
                    which product this is, so it paints with the frame rather
                    than streaming in — and a way out is the one thing that
                    should already be there while the page is still loading.
                    On a wide screen it sits directly over the price, the
                    first line of the column beneath it; on a phone, where the
                    cover image comes first, it stays at the top of the page,
                    which is where a way out is looked for. */}
                <BackLink href="/products" className="mb-8">
                    Volver al catálogo
                </BackLink>

                <Suspense fallback={<ProductSkeleton />}>
                    <ProductDetails params={params} />
                </Suspense>
            </div>
        </main>
    );
}

async function ProductDetails({
    params,
}: {
    params: Promise<{ productId: string }>;
}) {
    const { productId } = await params;
    const product = await getPublicProductWithSyllabus(productId);

    if (product == null) return notFound();

    const courseCount = product.courses.length;
    const lessonCount = sumBy(product.courses, course =>
        sumBy(course.courseSections, section => section.lessons.length)
    );

    return (
        <>
            <div className="flex flex-col-reverse gap-10 md:flex-row md:items-center md:gap-16">
                <div className="flex flex-col items-start gap-6 md:flex-1">
                    <div className="flex flex-col gap-3">
                        <Suspense
                            fallback={
                                <FullPrice
                                    priceInDollars={product.priceInDollars}
                                    className="text-3xl"
                                />
                            }
                        >
                            <ProductPrice
                                priceInDollars={product.priceInDollars}
                                className="text-3xl"
                            />
                        </Suspense>
                        <h1 className="text-5xl tracking-wide text-ink-bright">
                            {product.name}
                        </h1>
                        {/* formatPlural picks the singular or plural wording
                            from the count, so a product with a single course
                            reads "1 curso · 8 secciones". */}
                        <p className="text-base tracking-widest text-gold uppercase">
                            {formatPlural(courseCount, {
                                singular: "curso",
                                plural: "cursos",
                            })}{" "}
                            ·{" "}
                            {formatPlural(lessonCount, {
                                singular: "sección",
                                plural: "secciones",
                            })}
                        </p>
                    </div>
                    <p className="text-xl text-ink-body">
                        {product.description}
                    </p>
                    {/* Sells the product, or opens it if this visitor already
                        bought it. Buying goes straight to Stripe rather than via
                        an intermediate page — one click from wanting the product
                        to paying for it — and the action redirects to /login by
                        itself when nobody is signed in.

                        Its own boundary because ownership depends on the session
                        cookie, which is request-time data: the price, the title
                        and the syllabus below are all cached and must not wait
                        on a session lookup to appear. */}
                    <Suspense
                        fallback={
                            <ProductCallToActionSkeleton
                                withCourseLink={courseCount === 1}
                            />
                        }
                    >
                        <ProductCallToAction
                            productId={product.id}
                            courses={product.courses}
                        />
                    </Suspense>
                </div>
                <div className="relative aspect-video w-full md:max-w-lg md:flex-1">
                    <Image
                        src={product.imageUrl}
                        alt={product.name}
                        fill
                        className="rounded-xl object-contain"
                    />
                </div>
            </div>

            {/* Two columns only once there are two things to put in them. A
                lone syllabus runs the full width of the page — from where the
                description starts to where the cover image ends — because it
                is the whole of what is below the hero, and half a page of
                panel beside half a page of nothing reads as something that
                failed to load. */}
            {courseCount > 0 && (
                <div
                    className={`mt-12 grid grid-cols-1 items-start gap-8 ${
                        courseCount > 1 ? "lg:grid-cols-2" : ""
                    }`}
                >
                    {product.courses.map(course => (
                        <CourseSyllabus
                            key={course.id}
                            course={course}
                            // A single course has its "Ver curso" beside
                            // "Comprar ahora" already, and one page offering
                            // the same course twice is what moving it there
                            // was meant to stop. With several courses the
                            // panel's own button is the only way in, since the
                            // control above cannot answer "which one".
                            showCourseLink={courseCount > 1}
                        />
                    ))}
                </div>
            )}
        </>
    );
}

// One bundled course: its own counts, then every section as a fold-out list of
// lessons — and, where it is the only way in, a link to the course itself.
function CourseSyllabus({
    course,
    showCourseLink,
}: {
    course: ProductCourse;
    showCourseLink: boolean;
}) {
    const lessonCount = sumBy(
        course.courseSections,
        section => section.lessons.length
    );

    return (
        <div className="rounded-2xl border border-gold/40 bg-[#0a1628]/70 p-5 backdrop-blur-md">
            <h2 className="text-2xl tracking-wide text-ink-bright">
                {course.name}
            </h2>
            <p className="mt-1 text-sm tracking-widest text-gold uppercase">
                {formatPlural(course.courseSections.length, {
                    singular: "clase",
                    plural: "clases",
                })}{" "}
                ·{" "}
                {formatPlural(lessonCount, {
                    singular: "sección",
                    plural: "secciones",
                })}
            </p>

            {/* Open to everyone, owner or not, signed in or not. The course it
                leads to is public in the same way this syllabus is: it names
                every lesson and lets the preview ones be watched, and each
                other lesson answers with a lock rather than its contents. So
                nothing here depends on the session, and the whole card stays
                cached data rendered in one pass. */}
            {showCourseLink && (
                <div className="mt-4">
                    <PlaqueButton href={`/courses/${course.id}`} size="sm">
                        Ver curso
                    </PlaqueButton>
                </div>
            )}

            <div className="mt-4 flex flex-col">
                {course.courseSections.map(section => (
                    // A plain <details> is the accordion here: the browser
                    // handles opening and closing, so this stays a server
                    // component and still works before JavaScript loads.
                    <details
                        key={section.id}
                        className="group border-t border-gold/20 py-3"
                    >
                        <summary className="flex cursor-pointer list-none items-center gap-3 [&::-webkit-details-marker]:hidden">
                            <ChevronRight className="size-4 shrink-0 text-gold transition-transform group-open:rotate-90" />
                            <span className="flex flex-1 flex-col">
                                <span className="text-lg text-ink-bright">
                                    {section.name}
                                </span>
                                <span className="text-sm text-gold">
                                    {formatPlural(section.lessons.length, {
                                        singular: "sección",
                                        plural: "secciones",
                                    })}
                                </span>
                            </span>
                        </summary>
                        <div className="mt-3 flex flex-col gap-2 pl-7">
                            {section.lessons.map(lesson => (
                                <LessonRow
                                    key={lesson.id}
                                    lesson={lesson}
                                    courseId={course.id}
                                />
                            ))}
                        </div>
                    </details>
                ))}
            </div>
        </div>
    );
}

// One lesson in the syllabus, named either way but only sometimes offered.
//
// A preview lesson is watchable by anyone — signed in or not, owner or not — so
// its row is a link straight into it. Every other lesson would answer with a
// lock, so it stays plain text: naming what a product contains is the point of a
// syllabus, but inviting a click that leads to a refusal is not. The badge
// already marks which is which, and now marks which ones can be opened.
function LessonRow({
    lesson,
    courseId,
}: {
    lesson: ProductCourse["courseSections"][number]["lessons"][number];
    courseId: string;
}) {
    const rowClassName = "flex items-center gap-2 text-base text-ink-body";

    const content = (
        <>
            <LessonIcon type={lesson.type} />
            <span className="flex-1">{lesson.name}</span>
            {lesson.status === "preview" && (
                <span className="rounded border border-gold/50 px-2 py-0.5 text-xs tracking-widest text-ink uppercase">
                    Vista previa
                </span>
            )}
        </>
    );

    if (lesson.status !== "preview") {
        return <div className={rowClassName}>{content}</div>;
    }

    return (
        <Link
            href={`/courses/${courseId}/lessons/${lesson.id}`}
            className={`${rowClassName} rounded transition-colors hover:text-ink-bright`}
        >
            {content}
        </Link>
    );
}

function LessonIcon({ type }: { type: LessonType }) {
    const Icon = type === "text" ? FileText : Video;
    return <Icon className="size-4 shrink-0 text-ink-meta" />;
}

function ProductSkeleton() {
    return (
        <div className="animate-pulse">
            <div className="flex flex-col-reverse gap-10 md:flex-row md:gap-16">
                <div className="flex flex-col gap-4 md:flex-1">
                    <div className="h-7 w-28 rounded bg-gold/20" />
                    <div className="h-10 w-72 rounded bg-gold/20" />
                    <div className="h-4 w-48 rounded bg-gold/10" />
                    <div className="mt-4 h-14 w-48 rounded-lg bg-gold/10" />
                </div>
                <div className="aspect-video w-full rounded-xl bg-[#0a1628]/40 md:max-w-lg md:flex-1" />
            </div>
        </div>
    );
}

// Adds up a number pulled out of every item — the lesson counts that roll up
// from sections to courses to the whole product.
function sumBy<T>(items: T[], getValue: (item: T) => number) {
    return items.reduce((total, item) => total + getValue(item), 0);
}

// One course as the query below shapes it, derived from the query itself so the
// card never drifts from the columns actually selected.
type ProductCourse = NonNullable<
    Awaited<ReturnType<typeof getPublicProductWithSyllabus>>
>["courses"][number];

// The product plus its whole syllabus, hiding anything unpublished: private
// products 404, private sections disappear, and private lessons are omitted
// while "preview" ones stay visible as a teaser.
async function getPublicProductWithSyllabus(id: string) {
    "use cache";
    cacheTag(getProductIdTag(id));

    const product = await db.query.ProductTable.findFirst({
        columns: {
            id: true,
            name: true,
            description: true,
            imageUrl: true,
            priceInDollars: true,
        },
        where: and(
            eq(ProductTable.id, id),
            eq(ProductTable.status, "public")
        ),
        with: {
            courseProducts: {
                columns: {},
                with: {
                    course: {
                        columns: { id: true, name: true },
                        with: {
                            courseSections: {
                                columns: { id: true, name: true },
                                where: eq(CourseSectionTable.status, "public"),
                                orderBy: asc(CourseSectionTable.order),
                                with: {
                                    lessons: {
                                        columns: {
                                            id: true,
                                            name: true,
                                            status: true,
                                            type: true,
                                        },
                                        where: inArray(LessonTable.status, [
                                            "public",
                                            "preview",
                                        ]),
                                        orderBy: asc(LessonTable.order),
                                    },
                                },
                            },
                        },
                    },
                },
            },
        },
    });

    if (product == null) return product;

    // The page shows section and lesson data, so it must also refresh when
    // those change — not just when the product row itself is edited. Each
    // bundled course contributes its three tags.
    cacheTag(
        ...product.courseProducts.flatMap(({ course }) => [
            getCourseIdTag(course.id),
            getCourseSectionCourseTag(course.id),
            getLessonCourseTag(course.id),
        ])
    );

    const { courseProducts, ...rest } = product;

    return { ...rest, courses: courseProducts.map(({ course }) => course) };
}
