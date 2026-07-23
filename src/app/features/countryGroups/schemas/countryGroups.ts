import { z } from "zod";

// Admins enter the discount as a human-friendly percentage (0–100). The action
// converts it to the 0–1 fraction stored in the database.
export const countryGroupDiscountSchema = z.object({
    discountPercentage: z.number().min(0).max(100),
});
