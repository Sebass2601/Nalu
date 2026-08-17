import { Suspense } from "react";
import { notFound } from "next/navigation";
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
import { getProductGlobalTag } from "@/app/features/products/db/cache/products";
import { getCourseGlobalTag } from "@/app/features/courses/db/cache/courses";
import {
    Catalogue,
    CatalogueShell,
    CatalogueSkeleton,
} from "@/app/features/products/components/ProductCatalogue";
import { BackLink } from "@/components/ui/BackToHomeLink";
import { productHasWeeklyCourse } from "@/app/features/products/db/products";

// One page serving every category: the doorway clicked on the home page decides
// which id lands in the URL, and the same template renders that category's
// products.
//
// Under Cache Components `params` is only known at request time, so everything
// that depends on it lives inside the <Suspense> boundary below. That lets the
// frame render immediately while the products stream in.
export default function CategoryPage({
    params,
}: {
    params: Promise<{ categoryId: string }>;
}) {
    return (
        <CatalogueShell>
            {/* Back to the castle, which is where a category is chosen: its
                doorways are what lead here. Outside the boundary because the way
                out does not depend on which category this is, so it is already
                there while the products stream in.

                The pill nav below is sideways movement — between categories,
                or out to the whole catalogue — and never back up. */}
            <BackLink href="/fetch-courses" className="mb-8">
                Volver al castillo
            </BackLink>

            <Suspense fallback={<CatalogueSkeleton />}>
                <CategoryProducts params={params} />
            </Suspense>
        </CatalogueShell>
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
        <Catalogue
            current={category.id}
            title={category.name}
            description={category.description}
            products={products}
            emptyMessage="Aún no hay cursos disponibles en esta categoría."
        />
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
            uploadedWeekly: productHasWeeklyCourse(),
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
