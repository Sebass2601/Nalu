"use server";

import z from "zod";
import { countryGroupDiscountSchema } from "../schemas/countryGroups";
import { canUpdateCountryGroups } from "../permissions/countryGroups";
import { getCurrentUser } from "@/app/features/users/actions/currentUser";
import { updateCountryGroupDiscount as updateCountryGroupDiscountDB } from "../db/countryGroups";

export async function updateCountryGroupDiscount(
    id: string,
    unsafeData: z.infer<typeof countryGroupDiscountSchema>
) {
    const { success, data } = countryGroupDiscountSchema.safeParse(unsafeData);

    if (!success || !canUpdateCountryGroups(await getCurrentUser())) {
        return { error: true, message: "Error al actualizar el descuento." };
    }

    // Store the human-entered percentage (0–100) as a fraction (0–1).
    await updateCountryGroupDiscountDB(id, data.discountPercentage / 100);

    return { error: false, message: "Descuento actualizado exitosamente." };
}
