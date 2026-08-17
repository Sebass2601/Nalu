import { AnnouncementStatusEnum } from "@/drizzle/schema";
import { z } from "zod";

// What the announcement form is allowed to send.
//
// `content` is optional here even though an announcement with nothing in it is
// pointless to publish. The reason is the pictures: images belong to an
// announcement id, so there is nothing to attach them to until the row exists —
// requiring finished text to save would mean no images without text, and the
// writing often follows the picture. `status` is what decides whether an
// unfinished one is visible, and it defaults to private.
export const announcementSchema = z.object({
    name: z.string().min(1, "Required"),
    status: z.enum(AnnouncementStatusEnum.enumValues),
    // "" is what an untouched textarea submits, and it means "nothing written"
    // rather than "an empty string" — so it is stored as null, matching the
    // column and keeping one representation of empty instead of two.
    content: z
        .string()
        .transform(value => (value === "" ? null : value))
        .nullable(),
});
