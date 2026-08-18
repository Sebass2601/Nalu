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
    // Whether this course is one of the free classes on /newsletter. Required
    // rather than defaulted for the same resolver reason as the two flags above.
    freeContent: z.boolean(),
});

// The two giveaway flags cannot both be on.
//
// A free course is already readable by everyone, so listing it as something the
// subscription includes would be selling a thing that is not for sale. The
// checks that hide free courses from the subscription rows would win anyway —
// this exists so the impossible course is refused at the door rather than saved
// and then quietly ignored, and so a request sent straight to the server action
// is held to the same rule as the form.
//
// A separate export rather than a `.refine` on `courseSchema` itself: the form's
// resolver needs the plain object schema to read its shape and drive per-field
// validation, and a refined schema is a wrapper that no longer exposes it.
export const courseServerSchema = courseSchema.refine(
    course => !(course.freeContent && course.includedInSubscription),
    {
        message:
            "Un curso gratis no puede estar incluido en la suscripción",
        path: ["freeContent"],
    }
);
