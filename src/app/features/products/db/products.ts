import { db } from "@/drizzle/db";
import { CourseProductTable, ProductTable } from "@/drizzle/schema";
import { and, asc, eq, isNotNull } from "drizzle-orm";
import { cacheTag } from "next/cache";
import { deleteUploadThingFiles } from "@/lib/uploadthingServer";
import {
    getProductGlobalTag,
    getProductIdTag,
    revalidateProductCache,
} from "./cache/products";
import { wherePublicProducts } from "../permissions/products";
import { getHotmartProduct } from "@/lib/hotmartApi";

// Confirms a pasted Hotmart product ID actually resolves, and refuses the save
// if it does not.
//
// This is what replaces the Stripe sync. There is no Hotmart endpoint that
// creates or updates a product — the dashboard owns the catalogue and every
// product passes a human content review — so the admin types the codes in and
// the only thing this side can do is check them.
//
// Checking matters because the failure it prevents is invisible until the worst
// moment: a typo in the ID means the webhook cannot match a real payment back
// to a product, so someone pays and receives nothing. Verifying on save turns
// that into a form error.
//
// Only the product ID is verifiable. The hotlink and offer codes have no lookup
// endpoint, which is why the runbook has the admin open the checkout URL by
// hand once before going live.
async function assertHotmartProductExists(externalProductId: string | null) {
    if (externalProductId == null) return;

    const product = await getHotmartProduct(externalProductId);

    if (product == null) {
        throw new Error(
            `Hotmart no reconoce el producto ${externalProductId}. ` +
                "Revisa el ID de 7 dígitos en Mis Productos."
        );
    }
}

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
            checkoutCode: true,
            externalOfferCode: true,
            promoOfferCode: true,
            promoPriceInDollars: true,
            promoEndsAt: true,
        },
        where: and(eq(ProductTable.id, id), wherePublicProducts),
    });
}

// The cheapest way to buy one particular course, or null if there is no way at
// all. Used by a locked lesson, which knows the course it belongs to but not
// which product sells it — a course can be bundled into several.
//
// Cheapest because the question being answered is "what does it cost to unlock
// this", and the lowest price is the honest answer to it. Ties break on `id` so
// two products at the same price always resolve to the same one instead of
// following whatever order Postgres happened to return.
//
// A checkout code must exist: `startCheckout` throws on a product with no
// Hotmart counterpart, so offering one here would hand the buyer a crash
// instead of a checkout page.
//
// Tagged globally rather than per product: this asks about products it has not
// identified yet, and every product mutation calls `revalidateProductCache`,
// which updates this tag. A price change, a status flip and a re-linked course
// all refresh it.
export async function getCheapestPurchasableProductForCourse(courseId: string) {
    "use cache";
    cacheTag(getProductGlobalTag());

    const [product] = await db
        .select({
            id: ProductTable.id,
            priceInDollars: ProductTable.priceInDollars,
        })
        .from(ProductTable)
        .innerJoin(
            CourseProductTable,
            eq(CourseProductTable.productId, ProductTable.id)
        )
        .where(
            and(
                eq(CourseProductTable.courseId, courseId),
                wherePublicProducts,
                isNotNull(ProductTable.checkoutCode)
            )
        )
        .orderBy(asc(ProductTable.priceInDollars), asc(ProductTable.id))
        .limit(1);

    return product ?? null;
}

export async function insertProduct(
    data: typeof ProductTable.$inferInsert & { courseIds: string[] }
) {
    // Hotmart first, database second — the same ordering the Stripe sync used,
    // and for the same reason: a failed check leaves nothing behind locally,
    // whereas the reverse order would commit a product that looks fine in the
    // admin and cannot be bought. Outside the transaction too, because holding
    // one open across an HTTP call to a third party turns a slow API into
    // database lock contention.
    await assertHotmartProductExists(data.externalProductId ?? null);

    const newProduct = await db.transaction(async trx => {
        const [newProduct] = await trx
            .insert(ProductTable)
            .values(data)
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
    // Read the current row first, outside the transaction, so the image cleanup
    // below knows what it is replacing.
    const currentProduct = await db.query.ProductTable.findFirst({
        columns: {
            imageUrl: true,
            name: true,
            description: true,
            priceInDollars: true,
            status: true,
            externalProductId: true,
        },
        where: eq(ProductTable.id, id),
    });

    if (currentProduct == null) throw new Error("Producto no encontrado.");

    // Same ordering rule as insert: check Hotmart before committing locally,
    // and outside the transaction so a slow API call is not holding row locks.
    // `data` is Partial, so the field falls back to what is already stored —
    // an edit that does not touch the ID re-verifies the existing one, which
    // is deliberate: it repairs a product whose code was right when it was
    // entered and has since been deleted in Hotmart.
    await assertHotmartProductExists(
        data.externalProductId !== undefined
            ? data.externalProductId
            : currentProduct.externalProductId
    );

    const { updatedProduct, previousImageUrl } = await db.transaction(async trx => {
        const [updatedProduct] = await trx
            .update(ProductTable)
            .set(data)
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

    // Nothing to tell Hotmart. There is no API to archive or delete a product
    // there, and the dashboard owns that lifecycle now — so deleting here only
    // removes the local row and the link that sold it. The Hotmart product
    // stays live until someone pauses it by hand, which the runbook covers.
    await deleteUploadThingFiles(deletedProduct.imageUrl);
    revalidateProductCache(deletedProduct.id);

    return deletedProduct;
}
