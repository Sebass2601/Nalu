import { LessonStatusEnum, LessonTypeEnum } from "@/drizzle/schema";
import { z } from "zod";

export const lessonSchema = z
    .object({
        name: z.string().min(1, "Required"),
        sectionId: z.string().min(1, "Required"),
        status: z.enum(LessonStatusEnum.enumValues),
        type: z.enum(LessonTypeEnum.enumValues),
        youtubeVideoId: z
            .string()
            .transform(v => (v === "" ? null : v))
            .nullable(),
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
        if (data.type === "video" && data.youtubeVideoId == null) {
            ctx.addIssue({
                code: "custom",
                path: ["youtubeVideoId"],
                message: "Required for video lessons",
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
