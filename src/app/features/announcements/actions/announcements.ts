"use server";

import z from "zod";
import { redirect } from "next/navigation";
import { announcementSchema } from "../schemas/announcements";
import {
    canCreateAnnouncements,
    canDeleteAnnouncements,
    canUpdateAnnouncements,
} from "../permissions/announcements";
import {
    insertAnnouncement,
    updateAnnouncement as updateAnnouncementDB,
    deleteAnnouncement as deleteAnnouncementDB,
} from "../db/announcements";
import { getCurrentUser } from "../../users/actions/currentUser";

// Creating an announcement sends the admin straight to its edit screen rather
// than back to the list, because creating one is never the end of the job: the
// pictures can only be attached once the row has an id, and that screen is where
// they are attached. A "created successfully" toast over a list, with the new
// notice sitting there empty, would be an invitation to forget the rest.
//
// `redirect` throws, so it is called after every await and outside any try/catch.
export async function createAnnouncement(
    unsafeData: z.infer<typeof announcementSchema>
) {
    const { success, data } = announcementSchema.safeParse(unsafeData);

    if (!success || !canCreateAnnouncements(await getCurrentUser())) {
        return { error: true, message: "Hubo un error creando el anuncio." };
    }

    const announcement = await insertAnnouncement(data);

    redirect(`/admin/announcements/${announcement.id}/edit`);
}

export async function updateAnnouncement(
    id: string,
    unsafeData: z.infer<typeof announcementSchema>
) {
    const { success, data } = announcementSchema.safeParse(unsafeData);

    if (!success || !canUpdateAnnouncements(await getCurrentUser())) {
        return {
            error: true,
            message: "Hubo un error al actualizar el anuncio.",
        };
    }

    await updateAnnouncementDB(id, data);

    return { error: false, message: "Anuncio actualizado exitosamente." };
}

export async function deleteAnnouncement(id: string) {
    if (!canDeleteAnnouncements(await getCurrentUser())) {
        return { error: true, message: "Error al eliminar el anuncio." };
    }

    await deleteAnnouncementDB(id);

    return { error: false, message: "Anuncio eliminado exitosamente." };
}
