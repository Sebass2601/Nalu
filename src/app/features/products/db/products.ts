import { db } from "@/drizzle/db";
import { CourseProductTable, ProductTable } from "@/drizzle/schema";
import { and, eq } from "drizzle-orm";
import { cacheTag } from "next/cache";
import { deleteUploadThingFiles } from "@/lib/uploadthingServer";
import { getProductIdTag, revalidateProductCache } from "./cache/products";
import { wherePublicProducts } from "../permissions/products";
import {
    archiveStripeProduct,
    createStripeProduct,
    updateStripeProduct,
} from "../lib/stripeProducts";

// One published product, or undefined if it does not exist or is not public.
//
// Shared by the purchase page, the success page, and the checkout Server
// Action. The action deliberately calls this itself rather than trusting
// anything the page passed through the browser — but it should re-run the same
// query, not a second hand-written copy of it that can quietly drift.
export async function getPublicProduct(id: string) {
    "use cache";
    cacheTag(getProductIdTag(id));

    return db.query.ProductTable.findFirst({
        columns: {
            id: true,
            name: true,
            description: true,
            imageUrl: true,
            priceInDollars: true,
            stripePriceId: true,
        },
        where: and(eq(ProductTable.id, id), wherePublicProducts),
    });
}

export async function insertProduct(
    data: typeof ProductTable.$inferInsert & { courseIds: string[] }
) {
    // Stripe first, database second. A Stripe failure then leaves nothing
    // behind locally, whereas the reverse order would commit a product that
    // looks fine in the admin but cannot be bought, because checkout has no
    // price ID to reference. Doing it outside the transaction also matters:
    // holding a database transaction open across HTTP calls to a third party
    // is a good way to turn a slow API into database lock contention.
    const stripeIds = await createStripeProduct(data);

    const newProduct = await db.transaction(async trx => {
        const [newProduct] = await trx
            .insert(ProductTable)
            .values({ ...data, ...stripeIds })
            .returning();

        if (newProduct == null) {
            trx.rollback();
            throw new Error("Error al crear el producto.");
        }

        // Link the product to every course it bundles.
        await trx.insert(CourseProductTable).values(
            data.courseIds.map(courseId => ({
                productId: newProduct.id,
                courseId,
            }))
        );

        return newProduct;
    });

    revalidateProductCache(newProduct.id);

    return newProduct;
}

export async function updateProduct(
    id: string,
    data: Partial<typeof ProductTable.$inferInsert> & { courseIds: string[] }
) {
    // Read the current row first, outside the transaction, because the Stripe
    // reconciliation below needs to know which Stripe objects already exist.
    const currentProduct = await db.query.ProductTable.findFirst({
        columns: {
            imageUrl: true,
            name: true,
            description: true,
            priceInDollars: true,
            status: true,
            stripeProductId: true,
            stripePriceId: true,
        },
        where: eq(ProductTable.id, id),
    });

    if (currentProduct == null) throw new Error("Producto no encontrado.");

    // Same ordering rule as insert: reconcile Stripe before committing locally,
    // and outside the transaction so a slow API call is not holding row locks.
    // `data` is Partial, so each field falls back to what is already stored.
    const stripeIds = await updateStripeProduct({
        name: data.name ?? currentProduct.name,
        description: data.description ?? currentProduct.description,
        imageUrl: data.imageUrl ?? currentProduct.imageUrl,
        priceInDollars:
            data.priceInDollars ?? currentProduct.priceInDollars,
        status: data.status ?? currentProduct.status,
        stripeProductId: currentProduct.stripeProductId,
        stripePriceId: currentProduct.stripePriceId,
    });

    const { updatedProduct, previousImageUrl } = await db.transaction(async trx => {
        const [updatedProduct] = await trx
            .update(ProductTable)
            .set({ ...data, ...stripeIds })
            .where(eq(ProductTable.id, id))
            .returning();

        if (updatedProduct == null) {
            trx.rollback();
            throw new Error("Error al actualizar el producto.");
        }

        // Replace the whole set of course links: wipe the old ones, insert the
        // current selection. Doing both inside the transaction guarantees we
        // never leave the product with a half-updated course list.
        await trx
            .delete(CourseProductTable)
            .where(eq(CourseProductTable.productId, updatedProduct.id));

        await trx.insert(CourseProductTable).values(
            data.courseIds.map(courseId => ({
                productId: updatedProduct.id,
                courseId,
            }))
        );

        return {
            updatedProduct,
            previousImageUrl: currentProduct.imageUrl,
        };
    });

    if (previousImageUrl !== updatedProduct.imageUrl) {
        await deleteUploadThingFiles(previousImageUrl);
    }

    revalidateProductCache(updatedProduct.id);

    return updatedProduct;
}

export async function deleteProduct(id: string) {
    // The course_products rows are removed automatically by the "cascade"
    // rule on their productId foreign key, so a single delete is enough.
    const [deletedProduct] = await db
        .delete(ProductTable)
        .where(eq(ProductTable.id, id))
        .returning();

    if (deletedProduct == null) throw new Error("Error al eliminar el producto.");

    // Stripe last here, unlike create and update. The local delete is already
    // irreversible by this point, so there is nothing to protect by going first
    // — and archiving is best-effort anyway, since an orphaned active product
    // in Stripe is harmless while a failed archive must not resurrect the row.
    await archiveStripeProduct(deletedProduct.stripeProductId);
    await deleteUploadThingFiles(deletedProduct.imageUrl);
    revalidateProductCache(deletedProduct.id);

    return deletedProduct;
}
