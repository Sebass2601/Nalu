import { UserRole } from "@/drizzle/schema";

export function canCreateLessons(user: { role: UserRole | undefined }) {
    return user.role === "admin";
}

export function canUpdateLessons(user: { role: UserRole | undefined }) {
    return user.role === "admin";
}

export function canDeleteLessons(user: { role: UserRole | undefined }) {
    return user.role === "admin";
}
