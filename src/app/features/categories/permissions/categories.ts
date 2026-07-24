import { UserRole } from "@/drizzle/schema";

export function canCreateCategories(user: { role: UserRole | undefined }) {
    return user.role === "admin";
}

export function canUpdateCategories(user: { role: UserRole | undefined }) {
    return user.role === "admin";
}

export function canDeleteCategories(user: { role: UserRole | undefined }) {
    return user.role === "admin";
}
