import { UserRole } from "@/drizzle/schema";

export function canCreateCourses(user: { role: UserRole | undefined}) {
    return user.role === "admin";
}

export function canDeleteCourses(user: { role: UserRole | undefined}) {
    return user.role === "admin";
}