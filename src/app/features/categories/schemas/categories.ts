import { z } from "zod";

export const categorySchema = z.object({
    name: z.string().min(1, "Required"),
    // Optional free-text note about the category. Empty string is fine — it
    // gets stored as-is and the column is nullable in the database.
    description: z.string().optional(),
});
