import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { ProductTable } from "@/app/features/products/components/ProductTable";
import { cacheTag } from "next/cache";
import { getProductGlobalTag } from "@/app/features/products/db/cache/products";
import { db } from "@/drizzle/db";
import {
    CourseProductTable,
    ProductTable as DbProductTable,
    PurchaseTable,
} from "@/drizzle/schema";
import { asc, countDistinct, eq } from "drizzle-orm";

export default async function ProductsPage() {
    const products = await getProducts();
    return (
        <div className="min-h-[calc(100vh-5rem)] bg-white text-gray-900">
            <div className="container mx-auto px-6 py-6">
                <PageHeader title="Productos">
                    <Button asChild>
                        <Link href="/admin/products/new">Nuevo Producto</Link>
                    </Button>
                </PageHeader>

                <ProductTable products={products} />
            </div>
        </div>
    )
}

async function getProducts() {
    "use cache"
    cacheTag(getProductGlobalTag())

    return db
        .select({
            id: DbProductTable.id,
            name: DbProductTable.name,
            status: DbProductTable.status,
            priceInDollars: DbProductTable.priceInDollars,
            imageUrl: DbProductTable.imageUrl,
            coursesCount: countDistinct(CourseProductTable.courseId),
            customersCount: countDistinct(PurchaseTable.userId),
        })
        .from(DbProductTable)
        .leftJoin(PurchaseTable, eq(PurchaseTable.productId, DbProductTable.id))
        .leftJoin(
            CourseProductTable,
            eq(CourseProductTable.productId, DbProductTable.id)
        )
        .orderBy(asc(DbProductTable.name))
        .groupBy(DbProductTable.id)
}
