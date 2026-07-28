import { LessonStatusEnum, LessonTypeEnum } from "@/drizzle/schema";
import { z } from "zod";
import { extractYouTubeVideoId } from "../lib/youtubeVideoId";

export const lessonSchema = z
    .object({
        name: z.string().min(1, "Required"),
        sectionId: z.string().min(1, "Required"),
        status: z.enum(LessonStatusEnum.enumValues),
        type: z.enum(LessonTypeEnum.enumValues),
        // Normalised on the way in rather than on the way out, so the column
        // holds what its name promises. Storing the pasted URL instead is what
        // produced a lesson whose player silently loaded nothing: react-youtube
        // hands the value straight to YouTube as an id, and a URL is not one.
        //
        // Rejecting before transforming is what makes the difference between
        // "you left this empty" and "that link is not a YouTube video" — after
        // the transform both are just null and the message would be wrong.
        youtubeVideoId: z
            .string()
            // Nullable on the INPUT side, matching the other optional fields:
            // the form hands this field `null` for a lesson that never had a
            // video, and dropping that would change the shape the resolver
            // expects rather than just the validation.
            .nullable()
            .transform(v => (v ?? "").trim())
            .refine(v => v === "" || extractYouTubeVideoId(v) != null, {
                message: "Pega un enlace de YouTube válido o el ID del vídeo",
            })
            .transform(v => (v === "" ? null : extractYouTubeVideoId(v))),
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
