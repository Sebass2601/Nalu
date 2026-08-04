import { Suspense } from "react";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { cacheTag } from "next/cache";
import { db } from "@/drizzle/db";
import { CategoryTable } from "@/drizzle/schema";
import { getCategoryIdTag } from "@/app/features/categories/db/cache/categories";
import { CatalogueShell } from "@/app/features/products/components/ProductCatalogue";
import {
    getSubscriptionCoursesByCategory,
    UNCATEGORIZED_ROW_NAME,
    UNCATEGORIZED_SLUG,
} from "@/app/features/courses/db/subscriptionCourses";
import { SubscriptionCourseCard } from "@/app/features/courses/components/SubscriptionCourseCard";
import { DraggableStrip } from "@/components/ui/DraggableStrip";

// Rejects anything that is not a uuid before it reaches Postgres, which would
// raise on the comparison rather than simply matching nothing. A 404 is the
// honest answer for a made-up id.
const UUID_PATTERN =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Everything the subscription includes from one category, in full.
//
// Public: no session is read and no subscription is checked. `params` is
// request-time under Cache Components, so everything depending on it lives
// inside the <Suspense> boundary and the frame renders immediately.
export default function SubscriptionCategoryPage({
    params,
}: {
    params: Promise<{ categoryId: string }>;
}) {
    return (
        <CatalogueShell>
            <Suspense fallback={<CategoryCoursesSkeleton />}>
                <CategoryCourses params={params} />
            </Suspense>
        </CatalogueShell>
    );
}

async function CategoryCourses({
    params,
}: {
    params: Promise<{ categoryId: string }>;
}) {
    const { categoryId } = await params;
    const isUncategorized = categoryId === UNCATEGORIZED_SLUG;

    if (!isUncategorized && !UUID_PATTERN.test(categoryId)) return notFound();

    // The heading comes from the category row, the cards from the course
    // query. Two reads because they invalidate on different things: renaming a
    // category changes the title, flagging a course changes the grid.
    const category = isUncategorized ? null : await getCategory(categoryId);

    if (!isUncategorized && category == null) return notFound();

    const courses = await getSubscriptionCoursesByCategory(
        isUncategorized ? null : categoryId
    );

    return (
        <>
            <h1 className="mb-2 text-center text-4xl tracking-widest text-gold">
                {category?.name ?? UNCATEGORIZED_ROW_NAME}
            </h1>
            {category?.description && (
                <p className="mx-auto mb-8 max-w-2xl text-center text-base text-gold-body">
                    {category.description}
                </p>
            )}

            {/* Not a 404: the category exists, it simply has nothing in the
                plan yet, and those are different things to say. */}
            {courses.length === 0 ? (
                <p className="mt-12 text-center text-gold-body">
                    Aún no hay cursos de esta categoría incluidos en la
                    suscripción.
                </p>
            ) : (
                <>
                    {/* Phone: one dragged row rather than a column of
                        full-width cards, so the size of the category is
                        visible without scrolling past it. It does not loop —
                        unlike the sampler rows on /subscribe this is every
                        course in the category, and the end of the row is the
                        answer to "how many are there". */}
                    <div className="mt-8 lg:hidden">
                        <DraggableStrip
                            label="Cursos de la categoría"
                            previousLabel="Ver cursos anteriores"
                            nextLabel="Ver más cursos"
                        >
                            {courses.map(course => (
                                // Nearly the whole screen, matching the other
                                // listings. Capped so a large phone or a
                                // tablet does not stretch one card wider than
                                // the grid ever draws them.
                                <div
                                    key={course.id}
                                    className="w-[85vw] max-w-125 shrink-0 snap-start"
                                >
                                    <SubscriptionCourseCard course={course} />
                                </div>
                            ))}
                        </DraggableStrip>
                    </div>

                    {/* Wide screens keep the grid: this is the full listing
                        for the category, and there is room to lay it out at
                        once. */}
                    <div className="mt-8 hidden grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-6 lg:grid">
                        {courses.map(course => (
                            <SubscriptionCourseCard
                                key={course.id}
                                course={course}
                            />
                        ))}
                    </div>
                </>
            )}
        </>
    );
}

async function getCategory(id: string) {
    "use cache";
    cacheTag(getCategoryIdTag(id));

    return db.query.CategoryTable.findFirst({
        columns: { name: true, description: true },
        where: eq(CategoryTable.id, id),
    });
}

function CategoryCoursesSkeleton() {
    return (
        <div className="animate-pulse">
            <div className="mx-auto h-8 w-64 rounded bg-yellow-200/20" />
            <div className="mt-8 grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-6">
                {Array.from({ length: 6 }, (_, index) => (
                    <div
                        key={index}
                        className="h-56 rounded-2xl border border-yellow-200/20 bg-[#0a1628]/40"
                    />
                ))}
            </div>
        </div>
    );
}
