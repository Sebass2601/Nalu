"use server"

import z from "zod";
import { categorySchema } from "../schemas/categories";
import { redirect } from "next/navigation";
import {
    insertCategory,
    updateCategory as updateCategoryDB,
    deleteCategory as deleteCategoryDB,
} from "../db/categories";
import {
    canCreateCategories,
    canDeleteCategories,
    canUpdateCategories,
} from "../permissions/categories";
import { getCurrentUser } from "../../users/actions/currentUser";

export async function createCategory(unsafeData: z.infer<typeof categorySchema>) {
    const { success, data } = categorySchema.safeParse(unsafeData);

    if (!success || !canCreateCategories(await getCurrentUser())) {
        return { error: true, message: "Hubo un error creando la categoría." };
    }

    await insertCategory(data);

    redirect("/admin/categories");
}

export async function updateCategory(
    id: string,
    unsafeData: z.infer<typeof categorySchema>
) {
    const { success, data } = categorySchema.safeParse(unsafeData);

    if (!success || !canUpdateCategories(await getCurrentUser())) {
        return {
            error: true,
            message: "Hubo un error al actualizar la categoría.",
        };
    }

    await updateCategoryDB(id, data);

    redirect("/admin/categories");
}

export async function deleteCategory(id: string) {
    if (!canDeleteCategories(await getCurrentUser())) {
        return { error: true, message: "Error al eliminar la categoría." };
    }

    await deleteCategoryDB(id);

    return { error: false, message: "Categoría eliminada exitosamente." };
}
