import { createLessonVideoPlaybackUrl } from "@/lib/r2";

// The whole access story for lesson video, in one place: entitlement in, a
// playable URL or nothing out.
//
// There is no revocation step anywhere in this system, and there does not need
// to be one. Revocation is the absence of minting — once `canView` goes false
// the URL simply stops being made, and whatever was handed out earlier expires
// on its own within `LESSON_VIDEO_URL_TTL_SECONDS`. That is the property the
// YouTube embeds this replaced could never have: an unlisted video id, once
// read, worked forever.
//
// Deliberately NOT cached, and it must stay that way. Under Cache Components a
// `"use cache"` scope is keyed on its serialized inputs and replayed for
// everyone whose inputs match — so a signed URL cached here would be one
// student's playback token served to the next. Next's own guidance is to read
// request-scoped data outside cached scopes and pass values in as arguments,
// which is exactly the shape of this function: the caller does the entitlement
// check at request time and hands the answer down.
export async function getLessonVideoUrl({
    canView,
    videoKey,
}: {
    canView: boolean;
    videoKey: string | null;
}) {
    if (!canView || videoKey == null) return null;

    return createLessonVideoPlaybackUrl(videoKey);
}
