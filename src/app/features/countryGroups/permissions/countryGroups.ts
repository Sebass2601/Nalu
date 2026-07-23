import { UserRole } from "@/drizzle/schema";

export function canUpdateCountryGroups(user: { role: UserRole | undefined }) {
    return user.role === "admin";
}
