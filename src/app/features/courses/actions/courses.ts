"use server"

import z from "zod";
import { courseSchema } from "../schemas/courses";
import { redirect } from "next/navigation";
import { insertCourse } from "../db/courses";
import { canCreateCourses, canDeleteCourses } from "../permissions/courses";
import { getCurrentUser } from "../../users/actions/currentUser";

export async function createCourse(unsafeData: z.infer<typeof courseSchema>) {
    const {success, data} = courseSchema.safeParse(unsafeData);

    if (!success || !canCreateCourses(await getCurrentUser())) {
        return { error: true, message: "Hubo un error creando efl curso."}
    };

    const course = await insertCourse(data);

    redirect(`/admin/courses/${course.id}/edit`);
}

export async function deleteCourse(id: string) {
    if (!canDeleteCourses(await getCurrentUser())) {
        return { error: true, message: "Error al borrar el curso"}
    };

    await deleteCourse(id);

    return { error: false, message: "Curso eliminado exitosamente"}
}