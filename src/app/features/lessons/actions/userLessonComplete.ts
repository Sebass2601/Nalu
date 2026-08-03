"use server";

import { getCurrentUser } from "@/app/features/users/actions/currentUser";
import { canUpdateUserLessonCompleteStatus } from "../permissions/userLessonComplete";
import { updateLessonCompleteStatus as updateLessonCompleteStatusDb } from "../db/userLessonComplete";

// Toggles one lesson's completion for whoever is signed in.
//
// SECURITY — the lesson id and the desired state come from the browser, and
// nothing else does. The student is taken from the session cookie rather than an
// argument, so a caller cannot record progress against somebody else's account,
// and permission is re-checked here rather than trusted from the page: a Server
// Action is a public HTTP endpoint, reachable whether or not the page ever
// rendered the button.
//
// It returns a result object instead of throwing because `ActionButton` feeds
// the return value straight to a toast. The video player also calls this with
// nobody watching for a response, which is another reason a thrown error would
// be the wrong shape.
export async function updateLessonCompleteStatus(
    lessonId: string,
    complete: boolean
) {
    const { userId } = await getCurrentUser();

    const hasPermission = await canUpdateUserLessonCompleteStatus(
        { userId },
        lessonId
    );

    if (userId == null || !hasPermission) {
        return {
            error: true,
            message: "No se pudo actualizar el estado de la sección.",
        };
    }

    await updateLessonCompleteStatusDb({ lessonId, userId, complete });

    return {
        error: false,
        message: complete
            ? "Sección marcada como completada."
            : "Sección marcada como pendiente.",
    };
}
