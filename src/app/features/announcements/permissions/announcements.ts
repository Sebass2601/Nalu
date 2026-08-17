import { UserRole } from "@/drizzle/schema";

// Announcements are written by the school and read by everyone, so there is only
// one question to ask here and it is about the writer.
//
// Reading has no permission function on purpose: a published announcement is
// public, and an unpublished one is absent from every query that feeds a page
// rather than hidden behind a check.
export function canCreateAnnouncements(user: { role: UserRole | undefined }) {
    return user.role === "admin";
}

export function canUpdateAnnouncements(user: { role: UserRole | undefined }) {
    return user.role === "admin";
}

export function canDeleteAnnouncements(user: { role: UserRole | undefined }) {
    return user.role === "admin";
}
