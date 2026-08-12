import { z } from "zod";

// Both ids arrive from the browser as strings in a Server Action argument,
// which is to say from somewhere that can send anything at all. Parsing them as
// UUIDs before they reach a query is the cheap half of not trusting them; the
// admin check in the action is the other half.
export const courseAccessTargetSchema = z.object({
    courseId: z.uuid(),
    userId: z.uuid(),
});

export const courseAccessSearchSchema = z.object({
    courseId: z.uuid(),
    // Capped because the term is interpolated into a LIKE pattern. Postgres
    // handles a long pattern fine, but there is no reason to let a search box
    // send kilobytes.
    query: z.string().trim().max(200),
});
