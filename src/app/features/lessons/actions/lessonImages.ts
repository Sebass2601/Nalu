"use server";

import { z } from "zod";
import { canUpdateLessons } from "../permissions/lessons";
import { getCurrentUser } from "@/app/features/users/actions/currentUser";
import {
    getLessonImageCount,
    insertLessonImage,
    updateLessonImageCaption as updateLessonImageCaptionDB,
    updateLessonImageOrders as updateLessonImageOrdersDB,
    deleteLessonImage as deleteLessonImageDB,
} from "../db/lessonImages";
import {
    MAX_LESSON_IMAGES,
    MAX_LESSON_IMAGE_CAPTION_LENGTH,
} from "../lessonImages.constants";

const lessonImageCaptionSchema = z
    .string()
    .trim()
    .max(MAX_LESSON_IMAGE_CAPTION_LENGTH)
    .transform(caption => (caption === "" ? null : caption));

export async function addLessonImages(lessonId: string, urls: string[]) {
    if (!canUpdateLessons(await getCurrentUser())) {
        return { error: true, message: "No tienes permiso para agregar imágenes." };
    }

    const existing = await getLessonImageCount(lessonId);
    const available = MAX_LESSON_IMAGES - existing;

    if (available <= 0) {
        return {
            error: true,
            message: `Ya alcanzaste el máximo de ${MAX_LESSON_IMAGES} imágenes.`,
        };
    }

    // Only persist as many as fit within the limit.
    for (const url of urls.slice(0, available)) {
        await insertLessonImage({ lessonId, url });
    }

    return { error: false, message: "Imágenes agregadas exitosamente." };
}

export async function updateLessonImageOrders(imageIds: string[]) {
    if (imageIds.length === 0 || !canUpdateLessons(await getCurrentUser())) {
        return { error: true, message: "Error al reordenar las imágenes." };
    }

    await updateLessonImageOrdersDB(imageIds);

    return { error: false, message: "Imágenes reordenadas exitosamente." };
}

export async function updateLessonImageCaption(
    id: string,
    unsafeCaption: unknown
) {
    if (!canUpdateLessons(await getCurrentUser())) {
        return {
            error: true,
            message: "No tienes permiso para editar el texto de la imagen.",
        };
    }

    const { success, data } = lessonImageCaptionSchema.safeParse(unsafeCaption);

    if (!success) {
        return {
            error: true,
            message: `El texto no puede exceder ${MAX_LESSON_IMAGE_CAPTION_LENGTH} caracteres.`,
        };
    }

    await updateLessonImageCaptionDB(id, data);

    return {
        error: false,
        message: "Texto de la imagen actualizado exitosamente.",
    };
}

export async function deleteLessonImage(id: string) {
    if (!canUpdateLessons(await getCurrentUser())) {
        return { error: true, message: "Error al eliminar la imagen." };
    }

    await deleteLessonImageDB(id);

    return { error: false, message: "Imagen eliminada exitosamente." };
}
