import { Suspense } from "react";
import { notFound } from "next/navigation";
import { Cinzel } from "next/font/google";
import { and, asc, eq } from "drizzle-orm";
import { cacheTag } from "next/cache";
import { db } from "@/drizzle/db";
import {
    CategoryTable,
    CourseProductTable,
    CourseTable,
    ProductTable,
} from "@/drizzle/schema";
import { getCategoryIdTag } from "@/app/features/categories/db/cache/categories";
import { CategoryNav } from "@/app/features/categories/components/CategoryNav";
import { getProductGlobalTag } from "@/app/features/products/db/cache/products";
import { getCourseGlobalTag } from "@/app/features/courses/db/cache/courses";
import { ProductCard } from "@/app/features/products/components/ProductCard";

const cinzel = Cinzel({ subsets: ["latin"] });

// One page serving every category: the doorway clicked on the home page decides
// which id lands in the URL, and the same template renders that category's
// products.
//
// Under Cache Components `params` is only known at request time, so everything
// that depends on it lives inside the <Suspense> boundary below. That lets the
// heading frame render immediately while the products stream in.
export default function CategoryPage({
    params,
}: {
    params: Promise<{ categoryId: string }>;
}) {
    return (
        // The night-sky navy of the castle artwork, kept a shade lighter than
        // the cards' own #0a1628 tint so the frosted panels still read as
        // panels. The colour lives on the full-width element, not on the
        // centred column, or it would stop at the column's edges on wide
        // screens. min-h-screen keeps a short page from ending in a white band.
        <main
            className={`${cinzel.className} min-h-screen w-full bg-[#0a1628] bg-linear-to-b from-[#12243f] via-[#0d1c31] to-[#0a1628]`}
        >
            <div className="pt-28 px-4 max-w-6xl mx-auto pb-16">
                <Suspense fallback={<CategorySkeleton />}>
                    <CategoryProducts params={params} />
                </Suspense>
            </div>
        </main>
    );
}

async function CategoryProducts({
    params,
}: {
    params: Promise<{ categoryId: string }>;
}) {
    const { categoryId } = await params;
    const category = await getCategory(categoryId);

    if (category == null) return notFound();

    const products = await getCategoryProducts(categoryId);

    return (
        <>
            <CategoryNav currentCategoryId={category.id} />
            <h1 className="text-3xl tracking-widest text-yellow-200 mb-2 text-center">
                {category.name}
            </h1>
            {category.description && (
                <p className="text-sm text-yellow-200/70 mb-8 text-center max-w-2xl mx-auto">
                    {category.description}
                </p>
            )}

            {products.length === 0 ? (
                <p className="mt-12 text-center text-yellow-200/70">
                    Aún no hay cursos disponibles en esta categoría.
                </p>
            ) : (
                <div className="mt-8 grid grid-cols-[repeat(auto-fill,minmax(300px,1fr))] gap-6">
                    {products.map(product => (
                        <ProductCard key={product.id} {...product} />
                    ))}
                </div>
            )}
        </>
    );
}

// The heading area that stands in while the category is still being read.
function CategorySkeleton() {
    return (
        <div className="animate-pulse">
            <div className="mb-8 flex flex-wrap justify-center gap-2">
                {Array.from({ length: 5 }, (_, index) => (
                    <div
                        key={index}
                        className="h-7 w-32 rounded-full bg-yellow-200/10"
                    />
                ))}
            </div>
            <div className="h-8 w-64 mx-auto rounded bg-yellow-200/20" />
            <div className="mt-8 grid grid-cols-[repeat(auto-fill,minmax(300px,1fr))] gap-6">
                {Array.from({ length: 3 }, (_, index) => (
                    <div
                        key={index}
                        className="h-80 w-full max-w-125 mx-auto rounded-2xl border border-yellow-200/20 bg-[#0a1628]/40"
                    />
                ))}
            </div>
        </div>
    );
}

async function getCategory(id: string) {
    "use cache";
    cacheTag(getCategoryIdTag(id));

    return db.query.CategoryTable.findFirst({
        columns: { id: true, name: true, description: true },
        where: eq(CategoryTable.id, id),
    });
}

// Public products that bundle at least one course from this category. A product
// can bundle several courses of the same category, so the join is de-duplicated
// with DISTINCT to keep one card per product.
//
// Tagged with both the product and the course tags: editing a product changes
// what a card shows, while moving a course to another category changes which
// products belong here at all.
async function getCategoryProducts(categoryId: string) {
    "use cache";
    cacheTag(getProductGlobalTag(), getCourseGlobalTag());

    return db
        .selectDistinct({
            id: ProductTable.id,
            name: ProductTable.name,
            description: ProductTable.description,
            imageUrl: ProductTable.imageUrl,
            priceInDollars: ProductTable.priceInDollars,
        })
        .from(ProductTable)
        .innerJoin(
            CourseProductTable,
            eq(CourseProductTable.productId, ProductTable.id)
        )
        .innerJoin(
            CourseTable,
            eq(CourseTable.id, CourseProductTable.courseId)
        )
        .where(
            and(
                eq(ProductTable.status, "public"),
                eq(CourseTable.categoryId, categoryId)
            )
        )
        .orderBy(asc(ProductTable.name));
}
