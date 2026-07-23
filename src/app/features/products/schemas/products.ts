import { productStatuses } from "@/drizzle/schema";
import { z } from "zod";

export const productSchema = z.object({
    name: z.string().min(1, "Required"),
    priceInDollars: z.number().int().nonnegative(),
    description: z.string().min(1, "Required"),
    // Either a full external URL (https://…) or a local path (/imgs/…).
    imageUrl: z.union([
        z.url("Invalid url"),
        z.string().startsWith("/", "Invalid url"),
    ]),
    status: z.enum(productStatuses),
    // A product must bundle at least one course, otherwise buying it grants
    // access to nothing.
    courseIds: z.array(z.string()).min(1, "At least one course is required"),
});
