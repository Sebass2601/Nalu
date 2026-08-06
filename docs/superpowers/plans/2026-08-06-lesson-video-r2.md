# Lesson Video on Cloudflare R2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace unlisted-YouTube lesson embeds with private Cloudflare R2 storage and short-lived presigned URLs, so revoking course access actually revokes video playback.

**Architecture:** Video files live in a private R2 bucket. The lesson page's existing entitlement check gates the minting of a 6-hour presigned GET URL, which is handed to a native `<video>` element. Admins upload directly from the browser to R2 via a presigned PUT, bypassing the server entirely for file bytes.

**Tech Stack:** Next.js 16 (App Router, Cache Components), React 19, Drizzle ORM + Postgres (Supabase), `@aws-sdk/client-s3` + `@aws-sdk/s3-request-presigner` against R2's S3-compatible API, Vitest, pnpm.

## Global Constraints

- Package manager is **pnpm**, never npm.
- This Next.js version has breaking changes from training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing code that touches caching or routing.
- The app runs under **Cache Components** (`"use cache"` + `cacheTag`). A presigned URL must **never** be created inside a `"use cache"` scope — it is per-user data and caching it serves one student's playback token to another.
- All user-facing copy is **Spanish**, matching existing strings ("Subir imagen", "Este vídeo aún no está disponible", "No autorizado").
- Signed URL TTL is **6 hours** (`60 * 60 * 6` seconds).
- Object key format is `lessons/<lessonId>/<random>.mp4`.
- A presigned URL authenticates but does **not** exempt the browser from CORS. The bucket needs a CORS policy naming every origin that uploads or plays — `http://localhost:3000` for development, the production domain for deploys. Without it the admin upload fails despite a valid URL.
- The app's R2 token is **Object** Read & Write, never Admin. CORS is configured by hand, not by the app.
- Encoding standard: H.264 High profile + AAC, MP4, 1080×1920, CRF ~23, `-movflags +faststart`.
- Every task ends on a green typecheck: `pnpm exec tsc --noEmit`.

---

## Task 0: Manual setup — YOU DO THIS, NOT THE AGENT

Nothing in this plan can run until these exist. None of it is doable from the repository.

- [ ] **Step 1: Create a Cloudflare account**

Go to https://dash.cloudflare.com/sign-up. The **free plan is sufficient** — R2 does not require a paid Cloudflare plan. You will be asked for a payment card to enable R2 even on free usage; the free tier (10 GB storage, 1M writes, 10M reads, unlimited egress) recurs monthly and you are not charged below it.

- [ ] **Step 2: Enable R2 and create the bucket**

In the dashboard sidebar: **R2 Object Storage** → **Create bucket**.

- Name: `nalu-lesson-videos`
- Location: Automatic
- **Leave public access DISABLED.** Do not add a custom domain and do not enable the `r2.dev` public URL. If the bucket is public, this entire plan is pointless.

- [ ] **Step 3: Create a scoped API token**

**R2** → **Manage API Tokens** → **Create API Token**.

- Permission: **Object Read & Write**
- Scope: **Apply to specific buckets only** → `nalu-lesson-videos`
- TTL: leave as forever

**Object** Read & Write, not **Admin** Read & Write. Admin is what CORS and lifecycle configuration require, and the app never does either — CORS is set once, by hand, in the next step. Keeping the app's token to object operations means a leaked key cannot reconfigure the bucket.

Copy the three values it shows you — **you cannot see the secret again**:
- Access Key ID
- Secret Access Key
- Your Account ID (visible in the R2 overview page URL, or the right-hand sidebar)

- [ ] **Step 4: Add a CORS policy — without this the upload fails**

A presigned URL authenticates the request, but the browser still enforces CORS independently. Cloudflare's docs are explicit: *"Without a CORS policy, browser-based uploads and downloads using presigned URLs will fail, even though the presigned URL itself is valid."*

In the dashboard: **R2** → your bucket → **Settings** → **CORS Policy** → **Add CORS policy**, JSON tab:

```json
[
  {
    "AllowedOrigins": ["http://localhost:3000"],
    "AllowedMethods": ["GET", "PUT", "HEAD"],
    "AllowedHeaders": ["content-type"],
    "MaxAgeSeconds": 3600
  }
]
```

Only `localhost:3000` for now — the production origin is added in Task 9, once there is something deployed to add.

`PUT` is the method that strictly needs this: the admin upload is a `fetch(..., { method: "PUT" })`, which is a cross-origin request the browser will preflight. `content-type` must be in `AllowedHeaders` because the presigned URL is signed for a specific Content-Type and the client has to send a matching header. `GET`/`HEAD` are included for safety — a plain `<video src>` without a `crossorigin` attribute is a no-CORS media load and should play regardless, but including them costs nothing and covers anything that later fetches the video from JavaScript.

Alternatively via CLI, which uses your Cloudflare login rather than the R2 token:

```bash
npx wrangler r2 bucket cors set nalu-lesson-videos --file cors.json
npx wrangler r2 bucket cors list nalu-lesson-videos
```

CORS rule propagation can take up to 30 seconds. If Task 8's upload fails with a CORS error, wait and retry before changing anything.

- [ ] **Step 5: Put the credentials in `.env`**

Add to `/home/sebastian-ramirez/nalu/.env`:

```
R2_ACCOUNT_ID=<your account id>
R2_ACCESS_KEY_ID=<access key id>
R2_SECRET_ACCESS_KEY=<secret access key>
R2_BUCKET_NAME=nalu-lesson-videos
```

The secret access key can write to your bucket. It belongs in `.env` (gitignored) and, later, in Vercel — never in the repo.

**Nothing is configured on Vercel or Supabase at this point, deliberately.** The whole plan through Task 8 runs against local Postgres and the real R2 bucket. Production is touched only in Task 9, after you have seen the thing work.

- [ ] **Step 6: Install ffmpeg locally**

```bash
sudo apt install ffmpeg
ffmpeg -version
```

You will run this by hand on each video before uploading. There is no transcoding pipeline in the app.

- [ ] **Step 7: Confirm the catalogue state**

```bash
pnpm db:studio
```

Open the `lessons` table and note whether any row has a non-null `youtubeVideoId`. Task 3's migration refuses to run if any exist. If there are a handful, plan to re-encode and re-upload those videos; if there are many, stop and tell the agent — the migration needs a different shape.

`pnpm db:studio` reads the **local** Docker Postgres (`pnpm db:studio:remote` is the one that reaches Supabase). Check the local database here; Supabase gets the same check in Task 9 before its migration runs.

- [ ] **Step 8: Start local Postgres**

```bash
docker compose up -d
```

Everything through Task 8 runs against this database. `pnpm db:migrate` targets it; `pnpm db:migrate:remote` is the Supabase one and is not used until Task 9.

---

## Task 1: Test harness

The spec calls for testing the authorization boundary, and this project currently has no test runner at all. This task adds the smallest one that works.

**Files:**
- Modify: `package.json`
- Create: `vitest.config.ts`
- Create: `src/test/setup.ts`
- Create: `src/test/sanity.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `pnpm test` (single run) and `pnpm test:watch`. Path alias `@/` resolves in tests. All required server env vars carry dummy values under test.

- [ ] **Step 1: Install Vitest**

```bash
pnpm add -D vitest vite-tsconfig-paths
```

- [ ] **Step 2: Write the config**

Create `vitest.config.ts`:

```ts
import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
    plugins: [tsconfigPaths()],
    test: {
        environment: "node",
        setupFiles: ["./src/test/setup.ts"],
        include: ["src/**/*.test.ts"],
    },
});
```

- [ ] **Step 3: Write the env setup file**

`src/data/env/server.ts` validates every variable at import time, so anything importing it transitively needs all of them present. Create `src/test/setup.ts`:

```ts
// The env module validates on import, so any test that reaches it — directly or
// through a module that does — needs every required variable present. These are
// syntactically valid dummies, never real credentials: the point is to satisfy
// the schema, and a test that needs a real value should inject it explicitly.
const testEnv: Record<string, string> = {
    DB_PASSWORD: "test",
    DB_USER: "test",
    DB_NAME: "test",
    DB_HOST: "localhost",
    AUTH_SECRET: "test-secret",
    AUTH_GOOGLE_ID: "test-google-id",
    AUTH_GOOGLE_SECRET: "test-google-secret",
    UPLOADTHING_TOKEN: "test-uploadthing-token",
    STRIPE_SECRET_KEY: "sk_test_dummy",
    STRIPE_WEBHOOK_SECRET: "whsec_dummy",
    STRIPE_ALL_ACCESS_MONTHLY_PRICE_ID: "price_dummy_monthly",
    STRIPE_ALL_ACCESS_YEARLY_PRICE_ID: "price_dummy_yearly",
    SERVER_URL: "http://localhost:3000",
    R2_ACCOUNT_ID: "test-account-id",
    R2_ACCESS_KEY_ID: "test-access-key-id",
    R2_SECRET_ACCESS_KEY: "test-secret-access-key",
    R2_BUCKET_NAME: "test-bucket",
};

for (const [key, value] of Object.entries(testEnv)) {
    process.env[key] ??= value;
}
```

- [ ] **Step 4: Add the scripts**

In `package.json`, alongside the existing scripts:

```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 5: Write a sanity test**

Create `src/test/sanity.test.ts`:

```ts
import { expect, test } from "vitest";

test("the test harness runs and resolves the @ alias", async () => {
    const { env } = await import("@/data/env/server");
    expect(env.R2_BUCKET_NAME).toBe("test-bucket");
});
```

- [ ] **Step 6: Run it**

Run: `pnpm test`
Expected: PASS, 1 test.

- [ ] **Step 7: Commit**

```bash
git checkout -b lesson-video-r2
git add package.json pnpm-lock.yaml vitest.config.ts src/test/
git commit -m "test: add vitest harness"
```

---

## Task 2: R2 client and presigned URL module

**Files:**
- Modify: `src/data/env/server.ts`
- Create: `src/lib/r2.ts`
- Create: `src/lib/r2.test.ts`

**Interfaces:**
- Consumes: `env` from `@/data/env/server`.
- Produces:
  - `LESSON_VIDEO_URL_TTL_SECONDS: number` (21600)
  - `buildLessonVideoKey(lessonId: string): string`
  - `createLessonVideoUploadUrl(args: { lessonId: string; contentType: string }): Promise<{ uploadUrl: string; key: string }>`
  - `createLessonVideoPlaybackUrl(key: string): Promise<string>`

- [ ] **Step 1: Install the AWS SDK packages**

R2 speaks the S3 API, so the standard S3 client works against it.

```bash
pnpm add @aws-sdk/client-s3 @aws-sdk/s3-request-presigner
```

- [ ] **Step 2: Add the env vars**

In `src/data/env/server.ts`, inside the `server: { ... }` object, after `SERVER_URL`:

```ts
        // --- Cloudflare R2 -----------------------------------------------
        // Lesson videos live in a private bucket and are served only through
        // short-lived presigned URLs. The secret access key can write to that
        // bucket, so it lives in .env and Vercel and nowhere else.
        R2_ACCOUNT_ID: z.string().min(1),
        R2_ACCESS_KEY_ID: z.string().min(1),
        R2_SECRET_ACCESS_KEY: z.string().min(1),
        R2_BUCKET_NAME: z.string().min(1),
```

- [ ] **Step 3: Write the failing tests**

Create `src/lib/r2.test.ts`:

```ts
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
        // virtual-host style (test-bucket.test-account-id.r2...) or path style
        // (test-account-id.r2.../test-bucket/...), and which one it picks is not
        // something this module controls or should care about. What matters is
        // that the URL points at our account, names our object, and is signed.
        expect(url).toContain("r2.cloudflarestorage.com");
        expect(url).toContain("test-account-id");
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
```

- [ ] **Step 4: Run tests to verify they fail**

Run: `pnpm test src/lib/r2.test.ts`
Expected: FAIL — cannot resolve module `@/lib/r2`.

- [ ] **Step 5: Write the implementation**

Create `src/lib/r2.ts`:

```ts
import { randomUUID } from "node:crypto";
import { GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { env } from "@/data/env/server";

// Long enough to outlast the longest lesson plus pauses — a URL that dies
// mid-video breaks playback with no way for the viewer to understand why. R2
// permits up to seven days, which would defeat the point of signing at all:
// six hours means a leaked link is dead the same day.
export const LESSON_VIDEO_URL_TTL_SECONDS = 60 * 60 * 6;

// R2 speaks the S3 API. The region is always "auto" — R2 has no regions in the
// S3 sense, but SigV4 requires the field to be populated.
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
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `pnpm test src/lib/r2.test.ts`
Expected: PASS, 5 tests.

- [ ] **Step 7: Typecheck and commit**

```bash
pnpm exec tsc --noEmit
git add src/lib/r2.ts src/lib/r2.test.ts src/data/env/server.ts package.json pnpm-lock.yaml
git commit -m "feat: add R2 client and presigned URL helpers"
```

---

## Task 3: Schema migration

**Files:**
- Modify: `src/drizzle/schema/lesson.ts`
- Create: a generated migration under `src/drizzle/migrations/`

**Interfaces:**
- Consumes: nothing.
- Produces: `LessonTable.videoKey: string | null`, `LessonTable.videoDurationSeconds: number | null`. `LessonTable.youtubeVideoId` no longer exists.

- [ ] **Step 1: Guard against a non-empty catalogue**

Run this before touching anything:

```bash
pnpm db:studio
```

Check the `lessons` table for rows with a non-null `youtubeVideoId`. **If any exist, stop and report it** — dropping the column would discard them. This plan assumes the catalogue is empty, per the design.

- [ ] **Step 2: Edit the schema**

In `src/drizzle/schema/lesson.ts`, replace the `youtubeVideoId: text(),` line with:

```ts
    // The R2 object key, not a URL. Keys are safe to cache and safe to log; the
    // signed URL built from one is neither, which is why only the key is stored
    // and the URL is minted per request against the viewer's entitlement.
    videoKey: text(),
    // Not needed to play the video. Needed to show lesson length in the course
    // outline, and it is the denominator for any watch-progress work that
    // follows. One nullable column now is cheaper than a migration later.
    videoDurationSeconds: integer(),
```

`integer` is already imported at the top of the file.

- [ ] **Step 3: Generate the migration**

```bash
pnpm db:generate
```

- [ ] **Step 4: Read the generated SQL**

Open the newest file in `src/drizzle/migrations/`. Confirm it contains a `DROP COLUMN "youtubeVideoId"` and two `ADD COLUMN` statements, and nothing else. If Drizzle offers a rename prompt, decline it — these are new columns, not a rename.

- [ ] **Step 5: Apply it locally**

```bash
pnpm db:migrate
```

- [ ] **Step 6: Verify the typecheck fails in the expected places**

Run: `pnpm exec tsc --noEmit`
Expected: FAIL, with errors at every remaining reference to `youtubeVideoId` — the lesson page, `LessonBody`, `LessonForm`, the zod schema. That list is the work remaining in Tasks 4–7.

- [ ] **Step 7: Commit**

```bash
git add src/drizzle/schema/lesson.ts src/drizzle/migrations/
git commit -m "feat: replace lesson youtubeVideoId with R2 videoKey and duration"
```

---

## Task 4: Upload server actions

**Files:**
- Create: `src/app/features/lessons/actions/lessonVideo.ts`

**Interfaces:**
- Consumes: `createLessonVideoUploadUrl` from `@/lib/r2`; `canUpdateLessons` from `../permissions/lessons`; `getCurrentUser` from `@/app/features/users/actions/currentUser`; `updateLesson` from `../db/lessons`.
- Produces:
  - `requestLessonVideoUpload(args: { lessonId: string; contentType: string }): Promise<{ error: true; message: string } | { error: false; uploadUrl: string; key: string }>`
  - `saveLessonVideo(args: { lessonId: string; key: string; durationSeconds: number }): Promise<{ error: boolean; message: string }>`

- [ ] **Step 1: Write the actions**

Create `src/app/features/lessons/actions/lessonVideo.ts`:

```ts
"use server";

import { z } from "zod";
import { canUpdateLessons } from "../permissions/lessons";
import { getCurrentUser } from "../../users/actions/currentUser";
import { createLessonVideoUploadUrl } from "@/lib/r2";
import { updateLesson as updateLessonDb } from "../db/lessons";

// Only ever mp4 — the encoding standard produces one container and accepting
// anything else would mean a lesson whose video some browsers cannot play.
const requestSchema = z.object({
    lessonId: z.string().min(1),
    contentType: z.literal("video/mp4"),
});

const saveSchema = z.object({
    lessonId: z.string().min(1),
    key: z.string().min(1),
    durationSeconds: z.number().int().positive(),
});

// Hands the browser a URL it can PUT the file to directly. The file never
// passes through the server: video is far larger than a route should carry, and
// the upload would otherwise be bounded by function limits rather than by the
// user's connection.
export async function requestLessonVideoUpload(unsafeData: unknown) {
    const { success, data } = requestSchema.safeParse(unsafeData);

    if (!success || !canUpdateLessons(await getCurrentUser())) {
        return { error: true as const, message: "No autorizado" };
    }

    const { uploadUrl, key } = await createLessonVideoUploadUrl(data);

    return { error: false as const, uploadUrl, key };
}

// Called after the browser's PUT succeeds. Re-checks permission rather than
// trusting that whoever calls this is the same person who was granted the
// upload URL a moment ago.
export async function saveLessonVideo(unsafeData: unknown) {
    const { success, data } = saveSchema.safeParse(unsafeData);

    if (!success || !canUpdateLessons(await getCurrentUser())) {
        return { error: true, message: "No autorizado" };
    }

    await updateLessonDb(data.lessonId, {
        videoKey: data.key,
        videoDurationSeconds: data.durationSeconds,
    });

    return { error: false, message: "Vídeo guardado" };
}
```

- [ ] **Step 2: Typecheck this file's imports resolve**

Run: `pnpm exec tsc --noEmit`
Expected: still FAIL on the Task 3 leftovers (`LessonForm`, `LessonBody`, lesson page, zod schema), but **no new errors inside `lessonVideo.ts`**. If there are errors in this file, fix them before continuing.

- [ ] **Step 3: Commit**

```bash
git add src/app/features/lessons/actions/lessonVideo.ts
git commit -m "feat: add admin-guarded lesson video upload actions"
```

---

## Task 5: Admin upload field and form wiring

**Files:**
- Create: `src/app/features/lessons/components/VideoUploadField.tsx`
- Modify: `src/app/features/lessons/schemas/lessons.ts`
- Modify: `src/app/features/lessons/components/LessonForm.tsx`
- Delete: `src/app/features/lessons/lib/youtubeVideoId.ts`

**Interfaces:**
- Consumes: `requestLessonVideoUpload`, `saveLessonVideo` from `../actions/lessonVideo`.
- Produces: `<VideoUploadField lessonId value onChange disabled />` where `value: string | null` is the object key.

- [ ] **Step 1: Rewrite the zod schema**

In `src/app/features/lessons/schemas/lessons.ts`, delete the `extractYouTubeVideoId` import and replace the whole `youtubeVideoId` field with:

```ts
        // The R2 object key, set by the upload field rather than typed. Kept
        // nullable so a video lesson can be saved before its video exists —
        // the same allowance the YouTube id had.
        videoKey: z.string().nullable(),
```

Then in the `.superRefine`, replace the video branch:

```ts
        if (data.type === "video" && data.videoKey == null) {
            ctx.addIssue({
                code: "custom",
                path: ["videoKey"],
                message: "Sube un vídeo para esta lección",
            });
        }
```

- [ ] **Step 2: Delete the YouTube id parser**

```bash
git rm src/app/features/lessons/lib/youtubeVideoId.ts
```

Nothing else imports it once the schema above is rewritten. Confirm with:

```bash
grep -rn "youtubeVideoId\|extractYouTubeVideoId" src/
```

Expected: hits only in `LessonForm.tsx`, `LessonBody.tsx`, `SortableLessonList.tsx`, `LessonFormDialog.tsx`, and the lesson page — all fixed in this task and Task 6/7.

- [ ] **Step 3: Write the upload field**

Create `src/app/features/lessons/components/VideoUploadField.tsx`:

```tsx
"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import { Loader2Icon, VideoIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    requestLessonVideoUpload,
    saveLessonVideo,
} from "../actions/lessonVideo";

// The lesson video picker. Shaped after `ImageUploadField`, but the upload goes
// straight to R2 rather than through UploadThing: the file is too large for a
// server route, and R2 is the only place a private object can land.
//
// Duration is read here, in the browser, from a throwaway <video>. The
// alternative is ffprobe on the server, which would mean the server handling
// the bytes — exactly what the presigned PUT exists to avoid.
export function VideoUploadField({
    lessonId,
    value,
    onChange,
    disabled = false,
}: {
    // A video can only be uploaded once the lesson has an id to namespace the
    // object under, so a brand-new lesson must be saved first.
    lessonId: string | null;
    value: string | null | undefined;
    onChange: (value: string | null) => void;
    disabled?: boolean;
}) {
    const inputRef = useRef<HTMLInputElement>(null);
    const [isUploading, setIsUploading] = useState(false);

    async function readDurationSeconds(file: File) {
        const url = URL.createObjectURL(file);

        try {
            return await new Promise<number>((resolve, reject) => {
                const probe = document.createElement("video");
                probe.preload = "metadata";
                probe.onloadedmetadata = () => resolve(Math.round(probe.duration));
                probe.onerror = () => reject(new Error("No se pudo leer el vídeo"));
                probe.src = url;
            });
        } finally {
            URL.revokeObjectURL(url);
        }
    }

    async function upload(file: File) {
        if (lessonId == null) {
            toast.error("Guarda la lección antes de subir el vídeo");
            return;
        }

        if (file.type !== "video/mp4") {
            toast.error("El vídeo debe ser un MP4");
            return;
        }

        setIsUploading(true);

        try {
            const durationSeconds = await readDurationSeconds(file);

            const requested = await requestLessonVideoUpload({
                lessonId,
                contentType: file.type,
            });

            if (requested.error) {
                toast.error(requested.message);
                return;
            }

            // Content-Type must match what the URL was signed for, or R2
            // rejects the PUT with a signature mismatch.
            const response = await fetch(requested.uploadUrl, {
                method: "PUT",
                body: file,
                headers: { "Content-Type": file.type },
            });

            if (!response.ok) {
                toast.error("Falló la subida del vídeo");
                return;
            }

            const saved = await saveLessonVideo({
                lessonId,
                key: requested.key,
                durationSeconds,
            });

            if (saved.error) {
                toast.error(saved.message);
                return;
            }

            onChange(requested.key);
            toast.success("Vídeo subido");
        } catch {
            toast.error("Falló la subida del vídeo");
        } finally {
            setIsUploading(false);
        }
    }

    return (
        <div className="flex items-center gap-3">
            <div className="flex h-16 w-9 items-center justify-center rounded border border-dashed text-muted-foreground">
                {value ? (
                    <VideoIcon className="size-5 text-foreground" />
                ) : (
                    <VideoIcon className="size-5" />
                )}
            </div>
            <input
                ref={inputRef}
                type="file"
                accept="video/mp4"
                hidden
                onChange={event => {
                    const file = event.target.files?.[0];
                    if (file != null) void upload(file);
                    // Cleared so picking the same file twice still fires.
                    event.target.value = "";
                }}
            />
            <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={disabled || isUploading || lessonId == null}
                onClick={() => inputRef.current?.click()}
            >
                {isUploading ? (
                    <>
                        <Loader2Icon className="size-4 animate-spin" />
                        Subiendo...
                    </>
                ) : value ? (
                    "Cambiar vídeo"
                ) : (
                    "Subir vídeo"
                )}
            </Button>
        </div>
    );
}
```

- [ ] **Step 4: Wire it into the lesson form**

In `src/app/features/lessons/components/LessonForm.tsx`:

- change the `lesson` prop type field `youtubeVideoId: string | null` to `videoKey: string | null`
- change the default value `youtubeVideoId: lesson?.youtubeVideoId ?? ""` to `videoKey: lesson?.videoKey ?? null`
- change `const videoId = form.watch("youtubeVideoId")` to `const videoKey = form.watch("videoKey")`
- replace the `FormField` for `youtubeVideoId` (the text input for the YouTube link) with:

```tsx
                <FormField
                    control={form.control}
                    name="videoKey"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>
                                <RequiredLabelIcon />
                                Vídeo
                            </FormLabel>
                            <FormControl>
                                <VideoUploadField
                                    lessonId={lesson?.id ?? null}
                                    value={field.value}
                                    onChange={field.onChange}
                                />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
```

Add the import: `import { VideoUploadField } from "./VideoUploadField";`

Then follow the remaining `videoId` references in this file (there is at least a preview block keyed off it) and update them to use `videoKey`. Remove any YouTube preview markup — there is nothing to preview until the object is in R2.

- [ ] **Step 5: Fix the sibling call sites**

```bash
grep -rn "youtubeVideoId" src/app/features/lessons/ src/app/admin/
```

Update `LessonFormDialog.tsx` and `SortableLessonList.tsx` prop types from `youtubeVideoId: string | null` to `videoKey: string | null`. Update `src/app/admin/courses/[courseId]/edit/page.tsx` to select `videoKey` instead of `youtubeVideoId`.

- [ ] **Step 6: Typecheck**

Run: `pnpm exec tsc --noEmit`
Expected: FAIL only in `LessonBody.tsx` and the consumer lesson page — Tasks 6 and 7.

- [ ] **Step 7: Commit**

```bash
git add -A src/app/features/lessons/ src/app/admin/
git commit -m "feat: upload lesson video to R2 from the admin form"
```

---

## Task 6: Playback authorization

This is the task the whole change exists for. The signed URL is minted **outside** the `"use cache"` scope, after the entitlement check.

**Files:**
- Create: `src/app/features/lessons/lib/lessonVideoUrl.ts`
- Create: `src/app/features/lessons/lib/lessonVideoUrl.test.ts`
- Modify: `src/app/(consumer)/courses/[courseId]/lessons/[lessonId]/page.tsx`

**Interfaces:**
- Consumes: `createLessonVideoPlaybackUrl` from `@/lib/r2`.
- Produces: `getLessonVideoUrl(args: { canView: boolean; videoKey: string | null }): Promise<string | null>`

- [ ] **Step 1: Read the caching guide first**

```bash
cat node_modules/next/dist/docs/01-app/03-api-reference/01-directives/use-cache.md
```

The rule this task depends on: anything inside a `"use cache"` function is stored and replayed for other requests. `getLesson` in the lesson page is such a function — it carries `"use cache"` and a `cacheTag`. The signed URL must not be created there.

- [ ] **Step 2: Write the failing test**

Create `src/app/features/lessons/lib/lessonVideoUrl.test.ts`:

```ts
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
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `pnpm test src/app/features/lessons/lib/lessonVideoUrl.test.ts`
Expected: FAIL — cannot resolve `./lessonVideoUrl`.

- [ ] **Step 4: Write the implementation**

Create `src/app/features/lessons/lib/lessonVideoUrl.ts`:

```ts
import { createLessonVideoPlaybackUrl } from "@/lib/r2";

// The whole access story for video, in one place: entitlement in, a playable
// URL or nothing out.
//
// There is no revocation step anywhere in this system. Revocation is the
// absence of minting — once `canView` goes false the URL simply stops being
// made, and whatever was handed out earlier expires within six hours.
//
// Deliberately NOT cached. This must never sit inside a `"use cache"` scope:
// the URL is signed for one viewer at one moment, and a cached one is one
// student's playback token replayed to another.
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
```

- [ ] **Step 5: Run test to verify it passes**

Run: `pnpm test src/app/features/lessons/lib/lessonVideoUrl.test.ts`
Expected: PASS, 3 tests.

- [ ] **Step 6: Change what the cached query returns**

In the lesson page, inside `getLesson` (the `"use cache"` function around line 357), change the `columns` selection: replace `youtubeVideoId: true,` with

```ts
            videoKey: true,
```

The key is a plain identifier — safe to cache, safe to log. Only the URL built from it is sensitive.

- [ ] **Step 7: Mint the URL in the request-time path**

In the `Lesson` component, after the `canView` / `canComplete` / `isComplete` block (around line 86) and before the `return`:

```ts
    // Minted here rather than inside `getLesson` on purpose. `getLesson` is a
    // `"use cache"` function shared across requests; a signed URL is per viewer
    // and per moment, and caching one would hand this student's playback token
    // to the next.
    const videoUrl = await getLessonVideoUrl({
        canView,
        videoKey: lesson.videoKey,
    });
```

Add the import at the top:

```ts
import { getLessonVideoUrl } from "@/app/features/lessons/lib/lessonVideoUrl";
```

Then change the `<LessonBody>` call: replace `youtubeVideoId={lesson.youtubeVideoId}` with `videoUrl={videoUrl}`.

- [ ] **Step 8: Typecheck**

Run: `pnpm exec tsc --noEmit`
Expected: FAIL only inside `LessonBody.tsx`, which Task 7 rewrites.

- [ ] **Step 9: Commit**

```bash
git add src/app/features/lessons/lib/ "src/app/(consumer)/courses/[courseId]/lessons/[lessonId]/page.tsx"
git commit -m "feat: mint lesson video URLs against viewer entitlement"
```

---

## Task 7: Native player and vertical layout

**Files:**
- Create: `src/app/features/lessons/components/LessonVideoPlayer.tsx`
- Delete: `src/app/features/lessons/components/YouTubeVideoPlayer.tsx`
- Modify: `src/app/features/lessons/components/LessonBody.tsx`

**Interfaces:**
- Consumes: `videoUrl: string | null` from Task 6.
- Produces: `<LessonVideoPlayer src onFinishedVideo />`.

- [ ] **Step 1: Write the player**

Create `src/app/features/lessons/components/LessonVideoPlayer.tsx`:

```tsx
"use client";

import { useState } from "react";

// The lesson video. A plain <video> pointed at a presigned R2 URL.
//
// This replaces a component that existed almost entirely to wrangle YouTube's
// IFrame API — a global script loader, a mount-point swap because the API
// replaces the element it is given, and a teardown race when a lesson was left
// before the player finished building. None of that has an equivalent here.
export function LessonVideoPlayer({
    src,
    onFinishedVideo,
}: {
    src: string;
    // Bound Server Action, absent when the lesson is already complete or the
    // viewer has no business recording progress against it.
    onFinishedVideo?: () => void;
}) {
    const [failed, setFailed] = useState(false);

    // The URL is signed for six hours. A page left open longer than that has a
    // dead URL, and R2 answers an expired presigned URL with a 403 that carries
    // no CORS headers — so nothing here can read *why* it failed. Reloading
    // mints a fresh URL, which is the only thing the viewer can usefully do,
    // so that is what the message says.
    if (failed) {
        return (
            <div className="flex h-full w-full items-center justify-center bg-[#0a1628]/70 p-6 text-center text-base text-ink-meta">
                No se pudo cargar el vídeo. Recarga la página para volver a
                intentarlo.
            </div>
        );
    }

    return (
        <video
            // Keyed by src so swapping lessons rebuilds the element rather than
            // leaving the previous video's playback state attached to the new
            // one.
            key={src}
            src={src}
            controls
            preload="metadata"
            // Without this iOS Safari force-fullscreens every video, which
            // takes the lesson page off screen mid-lesson.
            playsInline
            onEnded={() => onFinishedVideo?.()}
            onError={() => setFailed(true)}
            className="h-full w-full"
        />
    );
}
```

- [ ] **Step 2: Rewrite LessonBody**

In `src/app/features/lessons/components/LessonBody.tsx`:

- change the import from `YouTubeVideoPlayer` to `import { LessonVideoPlayer } from "./LessonVideoPlayer";`
- change the prop `youtubeVideoId: string | null` to `videoUrl: string | null`
- change the wrapper class from `aspect-video w-full` to `aspect-[9/16] mx-auto max-h-[80vh] w-full` — lessons are vertical, and the height cap stops a portrait video running past the viewport on a desktop screen
- change the conditional body to:

```tsx
                    {videoUrl ? (
                        <LessonVideoPlayer
                            src={videoUrl}
                            onFinishedVideo={onVideoFinished}
                        />
                    ) : (
```

leaving the existing "Este vídeo aún no está disponible" fallback untouched.

- [ ] **Step 3: Delete the YouTube player**

```bash
git rm src/app/features/lessons/components/YouTubeVideoPlayer.tsx
```

- [ ] **Step 4: Confirm no YouTube references remain**

```bash
grep -rn "youtube\|YouTube" src/
```

Expected: no results.

- [ ] **Step 5: Typecheck and test**

Run: `pnpm exec tsc --noEmit && pnpm test`
Expected: both PASS.

- [ ] **Step 6: Lint**

Run: `pnpm lint`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add -A src/app/features/lessons/components/
git commit -m "feat: play lesson video from R2 in a vertical native player"
```

---

## Task 8: End-to-end verification with a real video

Nothing before this proves the system works. This task does.

**Files:**
- Create: `docs/encoding-lesson-video.md`

- [ ] **Step 1: Write the encoding note**

Create `docs/encoding-lesson-video.md`:

```markdown
# Encoding a lesson video

Run this on every video before uploading it in the admin lesson form.

    ffmpeg -i input.mov \
      -vf "scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2" \
      -c:v libx264 -profile:v high -crf 23 -preset slow \
      -c:a aac -b:a 128k \
      -movflags +faststart \
      output.mp4

`-movflags +faststart` is not optional. It moves the file index to the front so
playback can begin before the download finishes; without it a lesson appears to
hang until the whole video has arrived.

The `scale`/`pad` filter fits any source into the 1080x1920 vertical frame
without distorting it. Footage already shot 9:16 passes through untouched.
```

- [ ] **Step 2: Encode a real test video**

Take any video, run the command above, confirm the output plays locally and is MP4.

- [ ] **Step 3: Upload it through the admin form**

```bash
pnpm dev
```

Go to `/admin/courses`, open a course, edit a video lesson, and upload the encoded file. Confirm: the button shows "Subiendo...", then "Cambiar vídeo", and a success toast appears.

- [ ] **Step 4: Confirm the object is private**

In the Cloudflare dashboard, open the bucket and find the object under `lessons/<lessonId>/`. Confirm there is no public URL offered for it.

- [ ] **Step 5: Verify entitled playback and seeking**

Sign in as a user who owns the course, open the lesson, and confirm the video plays in a vertical frame with your own controls and no YouTube branding anywhere.

Then **drag the scrubber to the middle of the video**. Seeking depends on R2 honouring HTTP Range requests on a presigned GET — standard S3 behaviour, but this plan does not take it on faith. If seeking works, Range works. If it does not, the video will only play straight through, and that needs solving before this ships.

- [ ] **Step 6: Verify the revocation property — the point of all this**

Copy the video URL out of devtools (Network tab, the `.mp4` request). Paste it into a private browsing window. It plays — that is expected and correct within its six-hour window.

Now, in the database, delete the viewer's `user_course_access` row for that course (this is what a refund does via `revokeUserCourseAccess`). Reload the lesson page as that user.

Expected: the lesson is locked and **no new video URL is minted**. Confirm in devtools that no `.mp4` request is made at all.

That is the whole change: the page can no longer produce a playable URL, and the one already issued dies on its own within six hours. Under the old YouTube setup, that user would have kept the video permanently.

- [ ] **Step 7: Commit — but do not push yet**

```bash
git add docs/encoding-lesson-video.md
git commit -m "docs: add lesson video encoding standard"
```

Hold the push. If this repository is connected to Vercel, pushing a branch triggers a preview deployment, and that build would run without the `R2_*` variables — `src/data/env/server.ts` validates env at import, so it fails at boot rather than degrading. Task 9 adds the variables first, then pushes.

---

## Task 9: Deploy — only after Task 8 passed locally

Everything so far ran against local Postgres. This task is the first thing that touches production, and it is ordered this way on purpose.

- [ ] **Step 1: Confirm local verification is genuinely done**

Task 8 Step 6 — the revocation check — must have passed. If you have not personally watched the lesson lock and confirmed no `.mp4` request is made, stop here. That check is the entire point of the change and it cannot be verified in production without risking a live student's access.

- [ ] **Step 2: Add the R2 variables to Vercel**

```bash
vercel env add R2_ACCOUNT_ID production
vercel env add R2_ACCESS_KEY_ID production
vercel env add R2_SECRET_ACCESS_KEY production
vercel env add R2_BUCKET_NAME production
```

Repeat each for `preview` if you use preview deployments — a preview build fails at boot without them, for the same env-validation reason.

- [ ] **Step 3: Verify they landed**

```bash
vercel env ls
```

Expected: all four present for every environment you intend to build.

- [ ] **Step 4: Add the production origin to the bucket's CORS policy**

The policy from Task 0 Step 4 only allows `http://localhost:3000`. The deployed site is a different origin, and without it the admin upload fails in production exactly as it would have failed locally.

In the dashboard: **R2** → `nalu-lesson-videos` → **Settings** → **CORS Policy**, and extend `AllowedOrigins`:

```json
[
  {
    "AllowedOrigins": ["http://localhost:3000", "https://<your-production-domain>"],
    "AllowedMethods": ["GET", "PUT", "HEAD"],
    "AllowedHeaders": ["content-type"],
    "MaxAgeSeconds": 3600
  }
]
```

Add your Vercel preview domain too if you upload from preview deployments. Origins are exact matches — no wildcards for subdomains — and propagation can take up to 30 seconds.

- [ ] **Step 5: Check the Supabase catalogue before migrating it**

```bash
pnpm db:studio:remote
```

Same check as Task 0 Step 7, now against production: any row in `lessons` with a non-null `youtubeVideoId` will be destroyed by the column drop. If any exist, stop — those lessons need their videos re-encoded and re-uploaded first.

- [ ] **Step 6: Migrate the production database**

```bash
pnpm db:migrate:remote
```

- [ ] **Step 7: Push and let it build**

```bash
git push -u origin lesson-video-r2
```

Watch the deployment. A boot-time failure naming an `R2_*` variable means Step 2 missed an environment.

- [ ] **Step 8: Re-run the revocation check in production**

Repeat Task 8 Steps 5 and 6 against the deployed site with a test account: entitled playback works, and after removing the `user_course_access` row no `.mp4` request is made.

---

## Self-review notes

Checked against `docs/superpowers/specs/2026-08-06-lesson-video-r2-design.md`:

- Private bucket, key format, R2 over Supabase → Task 0, Task 2
- Schema (`videoKey`, `videoDurationSeconds`, drop `youtubeVideoId`, guard against a non-empty catalogue) → Task 3, Task 0 Step 7
- Direct-to-R2 upload, browser-read duration, admin guard → Tasks 4, 5
- Entitlement-gated minting, 6-hour TTL, never cached → Task 6
- Native player, prop shape preserved, `playsInline`, layout 9:16 → Task 7
- Encoding standard with `faststart` → Task 8
- Testing: authorization boundary, expiry, migration guard → Tasks 2, 6, and Task 3 Step 1
- Production rollout, deliberately last → Task 9

Tasks 1–8 run entirely against local Postgres and the real R2 bucket. Nothing
reaches Vercel or Supabase until Task 9, which is gated on the local revocation
check having passed.

No placeholders. Names are consistent across tasks: `videoKey` (never `videoId`), `getLessonVideoUrl`, `createLessonVideoPlaybackUrl`, `createLessonVideoUploadUrl`, `LESSON_VIDEO_URL_TTL_SECONDS`, `LessonVideoPlayer`.
