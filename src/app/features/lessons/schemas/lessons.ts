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
        if (data.type === "video" && data.videoKey == null) {
            ctx.addIssue({
                code: "custom",
                path: ["videoKey"],
                message: "Sube un vídeo para esta lección",
            });
        }

        if (data.type === "text" && data.content == null) {
            ctx.addIssue({
                code: "custom",
                path: ["content"],
                message: "Required for text lessons",
            });
        }
    });
