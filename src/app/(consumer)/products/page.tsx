import { Suspense } from "react";
import Image from "next/image";
import { db } from "@/drizzle/db";
import { ProductTable } from "@/drizzle/schema";
import { eq } from "drizzle-orm";
import { cacheTag } from "next/cache";
import { getProductGlobalTag } from "@/app/features/products/db/cache/products";
import {
    ProductPrice,
    FullPrice,
} from "@/app/features/products/components/ProductPrice";

export default async function ProductsPage() {
    const products = await getPublicProducts();

    return (
        <main className="pt-28 px-4 max-w-6xl mx-auto pb-16">
            <h1 className="text-3xl tracking-widest text-yellow-200 mb-8 text-center">
                Cursos
            </h1>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {products.map(product => (
                    <div
                        key={product.id}
                        className="rounded-2xl border border-yellow-200/40 bg-[#0a1628]/70 backdrop-blur-md overflow-hidden flex flex-col"
                    >
                        <div className="relative aspect-video w-full">
                            <Image
                                src={product.imageUrl}
                                alt={product.name}
                                fill
                                className="object-cover"
                            />
                        </div>
                        <div className="p-5 flex flex-col gap-3 flex-1">
                            <h2 className="text-lg tracking-wide text-yellow-100">
                                {product.name}
                            </h2>
                            <p className="text-sm text-yellow-200/70 line-clamp-3 flex-1">
                                {product.description}
                            </p>
                            {/* Full price streams instantly; the PPP-adjusted
                                price replaces it once the country resolves. */}
                            <Suspense
                                fallback={
                                    <FullPrice
                                        priceInDollars={product.priceInDollars}
                                    />
                                }
                            >
                                <ProductPrice
                                    priceInDollars={product.priceInDollars}
                                />
                            </Suspense>
                        </div>
                    </div>
                ))}
            </div>
        </main>
    );
}

// Public products only, cached under the shared product tag so admin edits
// refresh this list.
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
        orderBy: (products, { desc }) => desc(products.createdAt),
    });
}
