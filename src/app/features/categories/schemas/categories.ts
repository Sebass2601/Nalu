import { z } from "zod";
import { ASSIGNABLE_DOORWAY_IDS } from "@/components/ui/parallaxEntrances";

export const categorySchema = z.object({
    name: z.string().min(1, "Required"),
    // Optional free-text note about the category. Empty string is fine — it
    // gets stored as-is and the column is nullable in the database.
    description: z.string().optional(),
    // Which doorway of the castle this category sits at, or null for "not on
    // the castle". Only doorways the artwork actually has and that are not
    // reserved may be chosen, so a typo cannot produce a category that quietly
    // never appears.
    doorway: z
        .enum(ASSIGNABLE_DOORWAY_IDS as [string, ...string[]])
        .nullable(),
});
