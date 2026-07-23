"use server"

import z from "zod";
import { productSchema } from "../schemas/products";
import { redirect } from "next/navigation";
import {
    insertProduct,
    updateProduct as updateProductDB,
    deleteProduct as deleteProductDB,
} from "../db/products";
import {
    canCreateProducts,
    canDeleteProducts,
    canUpdateProducts,
} from "../permissions/products";
import { getCurrentUser } from "../../users/actions/currentUser";

export async function createProduct(unsafeData: z.infer<typeof productSchema>) {
    const { success, data } = productSchema.safeParse(unsafeData);

    if (!success || !canCreateProducts(await getCurrentUser())) {
        return { error: true, message: "Hubo un error creando el producto." };
    }

    await insertProduct(data);

    redirect("/admin/products");
}

export async function updateProduct(
    id: string,
    unsafeData: z.infer<typeof productSchema>
) {
    const { success, data } = productSchema.safeParse(unsafeData);

    if (!success || !canUpdateProducts(await getCurrentUser())) {
        return { error: true, message: "Hubo un error al actualizar el producto." };
    }

    await updateProductDB(id, data);

    redirect("/admin/products");
}

export async function deleteProduct(id: string) {
    if (!canDeleteProducts(await getCurrentUser())) {
        return { error: true, message: "Error al eliminar el producto." };
    }

    await deleteProductDB(id);

    return { error: false, message: "Producto eliminado exitosamente." };
}
