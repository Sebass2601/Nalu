import { ProductTable, UserRole } from "@/drizzle/schema";
import { eq } from "drizzle-orm";

export function canCreateProducts(user: { role: UserRole | undefined }) {
    return user.role === "admin";
}

export function canUpdateProducts(user: { role: UserRole | undefined }) {
    return user.role === "admin";
}

export function canDeleteProducts(user: { role: UserRole | undefined }) {
    return user.role === "admin";
}

// Reusable filter: "only products that are visible to the public".
// Handy later on the consumer-facing storefront.
export const wherePublicProducts = eq(ProductTable.status, "public");
