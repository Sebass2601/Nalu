import { LessonStatusEnum, LessonTypeEnum } from "@/drizzle/schema";
import { z } from "zod";

export const lessonSchema = z
    .object({
        name: z.string().min(1, "Required"),
        sectionId: z.string().min(1, "Required"),
        status: z.enum(LessonStatusEnum.enumValues),
        type: z.enum(LessonTypeEnum.enumValues),
        // The R2 object key, set by the upload field rather than typed. There is
        // nothing to validate beyond its presence: the value never comes from a
        // human, it comes back from the upload that just succeeded.
        //
        // Kept nullable so a video lesson can be saved before its video exists —
        // the same allowance the YouTube id had, and the reason `LessonBody`
        // still has an "aún no está disponible" state to render.
        videoKey: z.string().nullable(),
        content: z
            .string()
            .transform(v => (v === "" ? null : v))
            .nullable(),
        description: z
            .string()
            .transform(v => (v === "" ? null : v))
            .nullable(),
    })
    .superRefine((data, ctx) => {
        // A video lesson is deliberately NOT required to have a video yet.
        //
        // The upload writes to a key namespaced under the lesson, so there is
        // nowhere to put a file until the lesson has an id — which means
        // requiring one here would make a video lesson impossible to create:
        // no save without a video, no video without a save.
        //
        // The column is nullable and `LessonBody` already renders "Este vídeo
        // aún no está disponible" for exactly this state. Keeping the lesson
        // private until its video is uploaded is what `status` is for.
        if (data.type === "text" && data.content == null) {
            ctx.addIssue({
                code: "custom",
                path: ["content"],
                message: "Required for text lessons",
            });
        }
    });
