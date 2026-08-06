"use server";

import z from "zod";
import { canUpdateLessons } from "../permissions/lessons";
import { getCurrentUser } from "../../users/actions/currentUser";
import { createLessonVideoUploadUrl } from "@/lib/r2";
import { updateLesson as updateLessonDB } from "../db/lessons";

// Only ever mp4. The encoding standard in `docs/encoding-lesson-video.md`
// produces one container, and accepting anything else would mean a lesson whose
// video some browsers cannot play.
const requestSchema = z.object({
    lessonId: z.string().min(1),
    contentType: z.literal("video/mp4"),
});

const saveSchema = z.object({
    lessonId: z.string().min(1),
    key: z.string().min(1),
    durationSeconds: z.number().int().positive(),
    width: z.number().int().positive(),
    height: z.number().int().positive(),
});

// Hands the browser a URL it can PUT the file to directly. The file never
// passes through the server: video is far larger than a route should carry, and
// the upload would otherwise be bounded by function limits rather than by the
// admin's connection.
export async function requestLessonVideoUpload(
    unsafeData: z.infer<typeof requestSchema>
) {
    const { success, data } = requestSchema.safeParse(unsafeData);

    if (!success || !canUpdateLessons(await getCurrentUser())) {
        return { error: true as const, message: "No autorizado" };
    }

    const { uploadUrl, key } = await createLessonVideoUploadUrl(data);

    return { error: false as const, uploadUrl, key };
}

// Called after the browser's PUT succeeds. The permission check runs again
// rather than trusting that whoever calls this is the same person who was
// granted an upload URL a moment ago.
export async function saveLessonVideo(
    unsafeData: z.infer<typeof saveSchema>
) {
    const { success, data } = saveSchema.safeParse(unsafeData);

    if (!success || !canUpdateLessons(await getCurrentUser())) {
        return { error: true, message: "No autorizado" };
    }

    await updateLessonDB(data.lessonId, {
        videoKey: data.key,
        videoDurationSeconds: data.durationSeconds,
        videoWidth: data.width,
        videoHeight: data.height,
    });

    return { error: false, message: "Vídeo guardado" };
}
