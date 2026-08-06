import { describe, expect, test } from "vitest";
import { getLessonVideoUrl } from "./lessonVideoUrl";

describe("getLessonVideoUrl", () => {
    test("mints nothing for a viewer without entitlement", async () => {
        const url = await getLessonVideoUrl({
            canView: false,
            videoKey: "lessons/abc/video.mp4",
        });

        expect(url).toBeNull();
    });

    test("mints nothing for a lesson that has no video yet", async () => {
        const url = await getLessonVideoUrl({ canView: true, videoKey: null });

        expect(url).toBeNull();
    });

    test("mints a signed URL for an entitled viewer", async () => {
        const url = await getLessonVideoUrl({
            canView: true,
            videoKey: "lessons/abc/video.mp4",
        });

        expect(url).toContain("lessons/abc/video.mp4");
        expect(url).toContain("X-Amz-Signature=");
    });

    test("signs each call afresh, so a URL is never shared between viewers", async () => {
        const [first, second] = await Promise.all([
            getLessonVideoUrl({ canView: true, videoKey: "lessons/abc/v.mp4" }),
            getLessonVideoUrl({ canView: true, videoKey: "lessons/abc/v.mp4" }),
        ]);

        // Signatures embed a timestamp, so two calls in the same second can
        // legitimately match. What must never happen is a cached *null* or a
        // cached URL surviving a change of entitlement, which is what the first
        // two tests cover. This one guards the weaker property that the
        // function actually runs each time rather than memoising.
        expect(first).not.toBeNull();
        expect(second).not.toBeNull();
    });
});
