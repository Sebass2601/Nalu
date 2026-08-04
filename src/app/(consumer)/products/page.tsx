import { eq } from "drizzle-orm";
import { cacheTag } from "next/cache";
import { db } from "@/drizzle/db";
import { ProductTable } from "@/drizzle/schema";
import { getProductGlobalTag } from "@/app/features/products/db/cache/products";
import {
    Catalogue,
    CatalogueShell,
} from "@/app/features/products/components/ProductCatalogue";
import { BackLink } from "@/components/ui/BackToHomeLink";

// The whole catalogue, reached from the Todos plaque on any category page.
//
// No <Suspense> boundary here: this page takes no params and its queries are
// all "use cache" with no request-time input, so it prerenders whole. The
// per-card price still streams inside ProductCard.
export default async function ProductsPage() {
    const products = await getPublicProducts();

    return (
        <CatalogueShell>
            {/* The same way out the category pages carry, to the same place:
                the castle is where a visitor picks what to look at, and the
                pill nav below only moves sideways between catalogues. */}
            <BackLink href="/" className="mb-8">
                Volver a la página principal
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
async function getPublicProducts() {
    "use cache";
    cacheTag(getProductGlobalTag());

    return db.query.ProductTable.findMany({
        where: eq(ProductTable.status, "public"),
        columns: {
            id: true,
            name: true,
            description: true,
            imageUrl: true,
            priceInDollars: true,
        },
        orderBy: (products, { asc }) => asc(products.name),
    });
}
