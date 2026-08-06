import { randomUUID } from "node:crypto";
import {
    GetObjectCommand,
    PutObjectCommand,
    S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { env } from "@/data/env/server";

// Lesson video storage: a private R2 bucket reached only through presigned
// URLs.
//
// Nothing here decides who may watch — that is the caller's job, and the whole
// point of the design is that the entitlement check happens before a URL is
// ever minted. This module knows how to sign, not who to sign for.

// Long enough to outlast the longest lesson plus pauses. A URL that dies
// mid-video breaks playback with no way for the viewer to understand why, and
// R2 answers an expired presigned URL with a 403 carrying no CORS headers, so
// the browser cannot even read the reason.
//
// R2 permits up to seven days, which would defeat the point of signing at all.
// Six hours covers a viewing session and still means a leaked URL is dead the
// same day.
export const LESSON_VIDEO_URL_TTL_SECONDS = 60 * 60 * 6;

// R2 speaks the S3 API. `region: "auto"` is not optional — R2 has no regions in
// the S3 sense, but SigV4 requires the field, and leaving it out makes every
// call fail with an opaque credentials error rather than anything that names
// the real problem.
const client = new S3Client({
    region: "auto",
    endpoint: `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
        accessKeyId: env.R2_ACCESS_KEY_ID,
        secretAccessKey: env.R2_SECRET_ACCESS_KEY,
    },
});

// A random segment rather than a stable name, so replacing a lesson's video
// writes a new object. URLs already signed against the old key keep working
// until they expire and then die on their own — no cache busting, and no window
// in which a stale URL serves new content.
export function buildLessonVideoKey(lessonId: string) {
    return `lessons/${lessonId}/${randomUUID()}.mp4`;
}

// The browser uploads straight to R2 with this. The file never passes through
// the server: video is far larger than a route should carry, and the upload
// would otherwise be bounded by function limits rather than by the connection.
//
// `contentType` is baked into the signature, so the client has to send a
// matching `Content-Type` header or R2 rejects the PUT.
export async function createLessonVideoUploadUrl({
    lessonId,
    contentType,
}: {
    lessonId: string;
    contentType: string;
}) {
    const key = buildLessonVideoKey(lessonId);

    const uploadUrl = await getSignedUrl(
        client,
        new PutObjectCommand({
            Bucket: env.R2_BUCKET_NAME,
            Key: key,
            ContentType: contentType,
        }),
        { expiresIn: LESSON_VIDEO_URL_TTL_SECONDS }
    );

    return { uploadUrl, key };
}

export async function createLessonVideoPlaybackUrl(key: string) {
    return getSignedUrl(
        client,
        new GetObjectCommand({ Bucket: env.R2_BUCKET_NAME, Key: key }),
        { expiresIn: LESSON_VIDEO_URL_TTL_SECONDS }
    );
}
