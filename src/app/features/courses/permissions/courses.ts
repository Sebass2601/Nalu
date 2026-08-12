import { UserRole } from "@/drizzle/schema";

export function canCreateCourses(user: { role: UserRole | undefined}) {
    return user.role === "admin";
}

export function canDeleteCourses(user: { role: UserRole | undefined}) {
    return user.role === "admin";
}

export function canUpdateCourses(user: { role: UserRole | undefined}) {
    return user.role === "admin";
}

// Handing out course access without a purchase, and taking those grants back.
// Its own permission rather than a reuse of `canUpdateCourses`: editing a course
// changes what is on offer, while this changes who has already been let in, and
// the two would not necessarily always belong to the same role.
export function canManageCourseAccess(user: { role: UserRole | undefined}) {
    return user.role === "admin";
}