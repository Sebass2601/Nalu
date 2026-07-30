import { UserRole } from "@/drizzle/schema";

// Refunding moves real money out of the business, so it is the narrowest kind
// of permission: admins only, checked from the role in the database rather than
// from anything the browser sent.
export function canRefundPurchases(user: { role: UserRole | undefined }) {
    return user.role === "admin";
}
