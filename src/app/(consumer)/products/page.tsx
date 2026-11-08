import { asc, eq } from "drizzle-orm";
import { cacheTag } from "next/cache";
import { db } from "@/drizzle/db";
import { ProductTable } from "@/drizzle/schema";
import { getProductGlobalTag } from "@/app/features/products/db/cache/products";
import {
    Catalogue,
    CatalogueShell,
} from "@/app/features/products/components/ProductCatalogue";
import { BackLink } from "@/components/ui/BackToHomeLink";
import { productHasWeeklyCourse } from "@/app/features/products/db/products";
import { getCourseGlobalTag } from "@/app/features/courses/db/cache/courses";
import { pageMetadata } from "@/lib/pageMetadata";

// The whole catalogue, reached from the Todos plaque on any category page.
//
// No <Suspense> boundary here: this page takes no params and its queries are
// all "use cache" with no request-time input, so it prerenders whole. The one
// thing that can still stream is the price of a product whose promotion has an
// end date, and `ProductPrice` draws the boundary for that itself.
export const metadata = pageMetadata({
    path: "/products",
    title: "Todos los cursos",
    description:
        "Catálogo completo de cursos online de Nalu Escuela: numerología, tarot, sigilos, energías, arquetipos, magia draconiana, magia de espejos, magia del tiempo y realidad cuántica.",
});

export default async function ProductsPage() {
    const products = await getPublicProducts();

    return (
        <CatalogueShell>
            {/* The same way out the category pages carry, to the same place:
                the castle is where a visitor picks what to look at, and the
                pill nav below only moves sideways between catalogues. */}
            <BackLink href="/fetch-courses" className="mb-8">
                Volver al castillo
            </BackLink>

            <Catalogue
                current="all"
                title="Todos los cursos"
                products={products}
                emptyMessage="Aún no hay cursos disponibles."
            />
        </CatalogueShell>
    );
}

// Public products only, cached under the shared product tag so admin edits
// refresh this list. Sorted by name to match the category pages, so the order
// does not lurch when switching between plaques.
//
// Tagged on courses as well, because `uploadedWeekly` below is derived from
// them: ticking "contenido semanal" on a course revalidates the course tag and
// nothing else, so without this the card keeps showing yesterday's answer. The
// category pages already tagged both, which is why they were right and this was
// wrong.
async function getPublicProducts() {
    "use cache";
    cacheTag(getProductGlobalTag(), getCourseGlobalTag());

    // A plain select rather than the relational query this used to be, and
    // deliberately the same shape as the category page's version.
    //
    // `uploadedWeekly` is a correlated subquery: it asks about the product row
    // it sits beside. Passed through the relational builder's `extras` it came
    // back false for every product, because that builder renames the table it
    // selects from and the subquery's reference to `products.id` no longer meant
    // the row being returned. Here the table is itself, so the correlation
    // holds — verified against the database rather than assumed.
    return db
        .select({
            id: ProductTable.id,
            name: ProductTable.name,
            description: ProductTable.description,
            imageUrl: ProductTable.imageUrl,
            priceInDollars: ProductTable.priceInDollars,
            promoOfferCode: ProductTable.promoOfferCode,
            promoPriceInDollars: ProductTable.promoPriceInDollars,
            promoEndsAt: ProductTable.promoEndsAt,
            uploadedWeekly: productHasWeeklyCourse(),
        })
        .from(ProductTable)
        .where(eq(ProductTable.status, "public"))
        .orderBy(asc(ProductTable.name));
}
