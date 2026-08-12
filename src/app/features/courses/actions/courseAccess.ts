"use server";

import z from "zod";
import {
    courseAccessSearchSchema,
    courseAccessTargetSchema,
} from "../schemas/courseAccess";
import {
    grantCourseAccess as grantCourseAccessDb,
    revokeManualCourseAccess,
} from "../db/userCourseAccess";
import { searchUsersWithoutCourseAccess } from "../db/adminCourseAccess";
import { canManageCourseAccess } from "../permissions/courses";
import { getCurrentUser } from "../../users/actions/currentUser";
import { revalidateUserCourseAccessCache } from "../db/cache/userCourseAccess";

// The write side of the admin access screen.
//
// Each action re-checks the role from the database rather than trusting that
// the page it was called from was behind /admin. A Server Action is a public
// endpoint: it can be invoked directly, by anyone who knows it exists, from
// anywhere — the admin layout gating the page it lives on protects the page,
// not this.
//
// Both actions end by calling `revalidateUserCourseAccessCache`, which is what
// makes the change visible at once. `userOwnsCourse` — the query every gated
// lesson goes through — is a cached read tagged per user, so without this the
// revoked student keeps their access until that entry happens to expire.

export async function grantCourseAccess(
    unsafeData: z.infer<typeof courseAccessTargetSchema>
) {
    const { success, data } = courseAccessTargetSchema.safeParse(unsafeData);
    const currentUser = await getCurrentUser();

    if (!success || !canManageCourseAccess(currentUser)) {
        return { error: true, message: "Hubo un error al dar el acceso." };
    }

    const granted = await grantCourseAccessDb({
        userId: data.userId,
        courseId: data.courseId,
        // Non-null because `canManageCourseAccess` only passes for a real
        // account, which is the same check that produced this id.
        grantedBy: currentUser.userId!,
    });

    // Empty means the row was already there. Nothing changed, but the caller's
    // list is evidently behind, so it still needs refreshing.
    revalidateUserCourseAccessCache(data);

    return granted.length === 0
        ? { error: false, message: "Esta cuenta ya tenía acceso al curso." }
        : { error: false, message: "Acceso concedido." };
}

export async function revokeCourseAccess(
    unsafeData: z.infer<typeof courseAccessTargetSchema>
) {
    const { success, data } = courseAccessTargetSchema.safeParse(unsafeData);

    if (!success || !canManageCourseAccess(await getCurrentUser())) {
        return { error: true, message: "Hubo un error al quitar el acceso." };
    }

    const revoked = await revokeManualCourseAccess(data);

    // The query only deletes rows with a `grantedBy`, so nothing coming back
    // means the row belonged to a purchase — the case the button is hidden for,
    // reached anyway by a forged request or a list drawn before someone bought
    // the course. Refusing it here is what makes the rule real.
    if (revoked.length === 0) {
        return {
            error: true,
            message:
                "No se puede quitar el acceso de una compra. Para eso hay que reembolsarla.",
        };
    }

    revalidateUserCourseAccessCache(data);

    return { error: false, message: "Acceso retirado." };
}

// Feeds the add-by-email box. Returns a bare array because it fills a list
// rather than reporting on an attempt to change something; an unauthorized or
// malformed call simply finds nobody.
export async function searchAccountsForCourseAccess(
    unsafeData: z.infer<typeof courseAccessSearchSchema>
) {
    const { success, data } = courseAccessSearchSchema.safeParse(unsafeData);

    if (!success || !canManageCourseAccess(await getCurrentUser())) return [];

    return searchUsersWithoutCourseAccess(data);
}
