"use server"

import z from "zod";
import { courseSchema } from "../schemas/courses";
import { redirect } from "next/navigation";
import { insertCourse, deleteCourse as deleteCourseDB, updateCourse as updateCourseDB } from "../db/courses";
import { canCreateCourses, canDeleteCourses, canUpdateCourses } from "../permissions/courses";
import { getCurrentUser } from "../../users/actions/currentUser";

export async function createCourse(unsafeData: z.infer<typeof courseSchema>) {
    const {success, data} = courseSchema.safeParse(unsafeData);

    if (!success || !canCreateCourses(await getCurrentUser())) {
        return { error: true, message: "Hubo un error creando el curso."}
    };

    const course = await insertCourse(data);

    redirect(`/admin/courses/${course.id}/edit`);
}

export async function updateCourse(id: string, unsafeData: z.infer<typeof courseSchema>) {
    const {success, data} = courseSchema.safeParse(unsafeData);

    if (!success || !canUpdateCourses(await getCurrentUser())) {
        return  { error: true, message: "Hubo un error al actualizar el curso."}
    };

    await updateCourseDB(id, data);

    return { error: false, message: "Curso actualizado exitosamente"}
}

export async function deleteCourse(id: string) {
    if (!canDeleteCourses(await getCurrentUser())) {
        return { error: true, message: "Error al  borrar el curso"}
    };

    await deleteCourseDB(id);

    return { error: false, message: "Curso eliminado exitosamente"}
}