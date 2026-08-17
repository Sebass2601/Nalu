"use server";

import { z } from "zod";
import { canUpdateAnnouncements } from "../permissions/announcements";
import { getCurrentUser } from "@/app/features/users/actions/currentUser";
import {
    insertAnnouncementImages,
    updateAnnouncementImageCaption as updateAnnouncementImageCaptionDB,
    updateAnnouncementImageOrders as updateAnnouncementImageOrdersDB,
    deleteAnnouncementImage as deleteAnnouncementImageDB,
} from "../db/announcementImages";
import { MAX_IMAGE_CAPTION_LENGTH } from "@/lib/imageUploads.constants";

// The four things the announcement form's image manager may ask for. Each one
// re-checks the permission itself: a server action is a public endpoint, and the
// fact that the only button calling it lives behind an admin page is not a check.
const captionSchema = z
    .string()
    .trim()
    .max(MAX_IMAGE_CAPTION_LENGTH)
    .transform(caption => (caption === "" ? null : caption));

export async function addAnnouncementImages(
    announcementId: string,
    urls: string[]
) {
    if (!canUpdateAnnouncements(await getCurrentUser())) {
        return {
            error: true,
            message: "No tienes permiso para agregar imágenes.",
        };
    }

    if (urls.length === 0) {
        return { error: true, message: "No se recibió ninguna imagen." };
    }

    await insertAnnouncementImages(announcementId, urls);

    return { error: false, message: "Imágenes agregadas exitosamente." };
}

export async function updateAnnouncementImageOrders(imageIds: string[]) {
    if (
        imageIds.length === 0 ||
        !canUpdateAnnouncements(await getCurrentUser())
    ) {
        return { error: true, message: "Error al reordenar las imágenes." };
    }

    await updateAnnouncementImageOrdersDB(imageIds);

    return { error: false, message: "Imágenes reordenadas exitosamente." };
}

export async function updateAnnouncementImageCaption(
    id: string,
    unsafeCaption: unknown
) {
    if (!canUpdateAnnouncements(await getCurrentUser())) {
        return {
            error: true,
            message: "No tienes permiso para editar el texto de la imagen.",
        };
    }

    const { success, data } = captionSchema.safeParse(unsafeCaption);

    if (!success) {
        return {
            error: true,
            message: `El texto no puede exceder ${MAX_IMAGE_CAPTION_LENGTH} caracteres.`,
        };
    }

    await updateAnnouncementImageCaptionDB(id, data);

    return {
        error: false,
        message: "Texto de la imagen actualizado exitosamente.",
    };
}

export async function deleteAnnouncementImage(id: string) {
    if (!canUpdateAnnouncements(await getCurrentUser())) {
        return { error: true, message: "Error al eliminar la imagen." };
    }

    await deleteAnnouncementImageDB(id);

    return { error: false, message: "Imagen eliminada exitosamente." };
}
