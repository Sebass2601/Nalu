"use server"

import z from "zod";
import { lessonSchema } from "../schemas/lessons";
import {
    canCreateLessons,
    canDeleteLessons,
    canUpdateLessons,
} from "../permissions/lessons";
import {
    getNextCourseLessonOrder,
    insertLesson,
    updateLesson as updateLessonDB,
    deleteLesson as deleteLessonDB,
    updateLessonOrders as updateLessonOrdersDB,
} from "../db/lessons";
import { getCurrentUser } from "../../users/actions/currentUser";

export async function createLesson(unsafeData: z.infer<typeof lessonSchema>) {
    const { success, data } = lessonSchema.safeParse(unsafeData);

    if (!success || !canCreateLessons(await getCurrentUser())) {
        return { error: true, message: "Hubo un error creando la sección." };
    }

    const order = await getNextCourseLessonOrder(data.sectionId);

    await insertLesson({ ...data, order });

    return { error: false, message: "Sección creada exitosamente." };
}

export async function updateLesson(
    id: string,
    unsafeData: z.infer<typeof lessonSchema>
) {
    const { success, data } = lessonSchema.safeParse(unsafeData);

    if (!success || !canUpdateLessons(await getCurrentUser())) {
        return { error: true, message: "Hubo un error al actualizar la sección." };
    }

    await updateLessonDB(id, data);

    return { error: false, message: "Sección actualizada exitosamente." };
}

export async function deleteLesson(id: string) {
    if (!canDeleteLessons(await getCurrentUser())) {
        return { error: true, message: "Error al eliminar la sección." };
    }

    await deleteLessonDB(id);

    return { error: false, message: "Sección eliminada exitosamente." };
}

export async function updateLessonOrders(lessonIds: string[]) {
    if (lessonIds.length === 0 || !canUpdateLessons(await getCurrentUser())) {
        return { error: true, message: "Error al reordenar las secciones." };
    }

    await updateLessonOrdersDB(lessonIds);

    return { error: false, message: "Secciones reordenadas exitosamente." };
}
