import { describe, expect, test } from "vitest";
import {
    LESSON_VIDEO_URL_TTL_SECONDS,
    buildLessonVideoKey,
    createLessonVideoPlaybackUrl,
    createLessonVideoUploadUrl,
} from "@/lib/r2";

describe("buildLessonVideoKey", () => {
    test("namespaces the key under the lesson", () => {
        const key = buildLessonVideoKey("abc-123");

        expect(key.startsWith("lessons/abc-123/")).toBe(true);
        expect(key.endsWith(".mp4")).toBe(true);
    });

    test("returns a different key each call, so replacing a video is a new object", () => {
        expect(buildLessonVideoKey("abc-123")).not.toBe(
            buildLessonVideoKey("abc-123")
        );
    });
});

describe("createLessonVideoPlaybackUrl", () => {
    test("signs a URL for the object in the configured bucket", async () => {
        const url = await createLessonVideoPlaybackUrl("lessons/abc/video.mp4");

        // Asserted loosely on purpose. The SDK may address the bucket either
        // virtual-host style or path style, and which one it picks is not
        // something this module controls or should care about. What matters is
        // that the URL points at our account, names our object, and is signed.
        expect(url).toContain("r2.cloudflarestorage.com");
        expect(url).toContain("0123456789abcdef0123456789abcdef");
        expect(url).toContain("test-bucket");
        expect(url).toContain("lessons/abc/video.mp4");
        expect(url).toContain("X-Amz-Signature=");
    });

    test("expires after the six-hour TTL", async () => {
        const url = await createLessonVideoPlaybackUrl("lessons/abc/video.mp4");

        expect(url).toContain(`X-Amz-Expires=${LESSON_VIDEO_URL_TTL_SECONDS}`);
        expect(LESSON_VIDEO_URL_TTL_SECONDS).toBe(60 * 60 * 6);
    });
});

describe("createLessonVideoUploadUrl", () => {
    test("returns a signed PUT URL and the key it was signed for", async () => {
        const { uploadUrl, key } = await createLessonVideoUploadUrl({
            lessonId: "abc-123",
            contentType: "video/mp4",
        });

        expect(key.startsWith("lessons/abc-123/")).toBe(true);
        expect(uploadUrl).toContain(key);
        expect(uploadUrl).toContain("X-Amz-Signature=");
    });
});
