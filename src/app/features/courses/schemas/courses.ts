import { z } from "zod";

export const courseSchema = z.object({
    name: z.string().min(1, "Required"),
    description: z.string().min(1, "Required"),
    // Which category the course belongs to. Optional/nullable: a course may be
    // left un-categorized (null), or there may be no categories yet to pick.
    categoryId: z.string().nullable().optional()
});
