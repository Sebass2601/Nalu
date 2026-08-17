import { z } from "zod";

export const courseSchema = z.object({
    name: z.string().min(1, "Required"),
    description: z.string().min(1, "Required"),
    // Optional cover art: either a full external URL (https://…) or a local path
    // (/imgs/…). Nullable rather than `.optional()` or `.default(null)` for the
    // same reason as `includedInSubscription` below — a Zod default makes the
    // field optional on input but present on output, and react-hook-form's
    // resolver needs those two types to match. The form supplies null itself.
    imageUrl: z
        .union([
            z.url("Invalid url"),
            z.string().startsWith("/", "Invalid url"),
        ])
        .nullable(),
    // Which category the course belongs to. Optional/nullable: a course may be
    // left un-categorized (null), or there may be no categories yet to pick.
    categoryId: z.string().nullable().optional(),
    // Whether an active subscriber can read this course without buying it.
    // Required rather than `.default(false)`: a Zod default makes the field
    // optional on input but present on output, and react-hook-form's resolver
    // needs those two types to match. The form supplies `false` as its own
    // default instead, so a course is still never added to the subscription by
    // omission.
    includedInSubscription: z.boolean(),
    // Whether material is still being added week by week. Required here for the
    // same resolver reason as the flag above, and the form supplies `false` as
    // its default — so the column's null, which older courses carry, is never
    // written back by an edit: saving a course answers the question either way.
    uploadedWeekly: z.boolean(),
});
