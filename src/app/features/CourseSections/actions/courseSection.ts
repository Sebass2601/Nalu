"use server"

import z from "zod";
import { sectionSchema } from "../schemas/sections";
import { canCreateCourseSections, canDeleteCourseSections, canUpdateCourseSections } from "../permissions/courseSection";
import { getNextCourseSectionOrder, 
         insertSection, 
         updateSection as updateSectionDB, 
         deleteSection as deleteSectionDB,
         updateSectionOrders as updateSectionOrdersDB,
        } from "../db/courseSections";
import { getCurrentUser } from "../../users/actions/currentUser";

export async function createSection(courseId: string, unsafeData: z.infer<typeof sectionSchema>) {
    const {success, data} = sectionSchema.safeParse(unsafeData);

    if (!success || !canCreateCourseSections(await getCurrentUser())) {
        return { error: true,  message: "Hubo un error creando la Lesson."}
    };

    const order = await getNextCourseSectionOrder(courseId);

    await insertSection({...data, courseId, order });

    return { error: false, message: "Lesson creada exitosamente."};
}


export async function updateSection(id: string, unsafeData: z.infer<typeof sectionSchema>) {
    const {success, data } = sectionSchema.safeParse(unsafeData);

    if (!success || !canUpdateCourseSections(await getCurrentUser())) {
        return { error: true, message: "Hubo un error al actualizar la seccion."}
    }

    await updateSectionDB(id, data);

    return { error: false, message: "Seccion actualizada exitosamente."};
}

export async function deleteSection(id: string) {
    if (!canDeleteCourseSections(await getCurrentUser())) {
        return { error: true, message: "Error"}
    };

    await deleteSectionDB(id);

    return { error: false, message: "Seccion eliminada exitosamente."}
}

export async function updateSectionOrders(sectionIds: string[]) {
    if (
        sectionIds.length === 0 ||
        !canUpdateCourseSections(await getCurrentUser())
    ) {
        return {error: true, message: "Error al reodernar secciones."}
    }

    await updateSectionOrdersDB(sectionIds);

    return {error: false, message: "Seccion actualizada exitosamente."}
}