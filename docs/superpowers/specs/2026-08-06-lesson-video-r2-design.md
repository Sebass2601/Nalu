# Lesson video on R2: playback the site can actually revoke

Date: 2026-08-06

## Problem

Lesson videos are unlisted YouTube videos. `LessonTable.youtubeVideoId` holds the
id, `LessonBody` passes it to `YouTubeVideoPlayer`, and that component embeds it
through YouTube's IFrame API. The id therefore reaches the browser on every
lesson page, in the DOM, for anyone who can open the page.

An unlisted YouTube id is a bearer token that never expires. Anyone who reads it
once can watch at `youtube.com/watch?v=<id>` forever, and can hand it to anyone
else.

That makes the site's access control decorative on the only thing it is meant to
protect. `revokeUserCourseAccess` runs on refund — the webhook at
`api/webhooks/stripe/route.ts` calls it the moment a charge is reversed — and it
removes the lesson page. It cannot remove the video. A buyer who refunds keeps
the course, and so does anyone they send the link to.

Two smaller problems fall out of the same decision. The embed carries YouTube's
branding, context menu and suggested-video surface into a paid course. And the
player reports only that a video reached its end, so the site has no honest
measure of how much of a lesson anyone actually watched.

## Goals

1. Revoking course access revokes video playback, within hours at worst.
2. Nothing in the lesson page is a durable, shareable handle on the video.
3. The frame around the video is entirely ours — no third-party branding.
4. Vertical (9:16) video is a first-class format, not something letterboxed
   into a 16:9 box.

Non-goals: preventing a determined viewer from screen-recording or downloading
the file while they legitimately have access. This is revocation, not DRM, and
DRM on web video does not work. Also out of scope: adaptive bitrate streaming,
watch-progress tracking, and any change to how images are stored — UploadThing
keeps those.

## Design

### Where the files live

A private Cloudflare R2 bucket. No public access, no custom domain, no bucket
level sharing. Nothing in it is reachable without a signature.

R2 rather than Supabase Storage, which the project could otherwise reach for
since the Supabase project already exists. Video's dominant cost is egress, and
egress is the cost that grows precisely when the business works. R2 charges
nothing for it at any volume; Supabase meters it. Storage itself is rounding
error either way — the catalogue would have to pass roughly ten hours of video
before leaving R2's free tier at all, and a hundred hours costs about $1.35 a
month.

Object keys are `lessons/<lessonId>/<random>.mp4`. The random segment rather
than a stable name is what makes replacing a video safe: the new file is a new
key, so signed URLs still pointing at the old one keep working until they
expire and then die. No cache-busting, and no window in which a stale URL
serves new content.

### Schema

On `LessonTable`:

- `youtubeVideoId` is dropped.
- `videoKey: text()` — the R2 object key. Nullable, which preserves the
  existing behaviour where a video lesson can be saved before its video exists;
  `LessonBody` already renders "Este vídeo aún no está disponible" for that case.
- `videoDurationSeconds: integer()` — nullable.

Duration is not needed for playback. It is needed to show lesson length in the
course outline, and it is the denominator for watch-progress work that is
likely to follow. One nullable column now is cheaper than a migration later.

Dimensions are deliberately not stored. Every lesson is 9:16, so the aspect
ratio is a constant in CSS rather than data. If mixed orientations are ever
wanted, that is the point at which a column earns its place.

The migration checks for rows with a non-null `youtubeVideoId` before dropping
the column and fails loudly if it finds any, so a catalogue that turned out not
to be empty cannot be silently discarded.

### Upload

Video files are far larger than a Next.js route should carry, so the browser
uploads directly to R2 and the server only ever handles the paperwork:

1. An admin picks a file in the lesson form. The browser reads its duration
   locally from a throwaway `<video>` element (`loadedmetadata` → `duration`).
   No server-side `ffprobe`.
2. An admin-guarded server action mints a presigned `PUT` for a fresh key.
3. The browser `PUT`s the file straight to R2, reporting progress.
4. A second server action writes `videoKey` and `videoDurationSeconds` onto the
   lesson.

The shape mirrors the existing `ImageUploadField`, so the admin form keeps one
upload idiom rather than two. Uploads are admin-only; the existing `/admin`
guards are the whole authorisation story, because students and third-party
instructors never upload.

The bucket needs a CORS policy for this to work at all. A presigned URL settles
authentication, not the browser's same-origin rules — Cloudflare's docs are
explicit that browser uploads through a presigned URL fail without one, valid
URL or not. The policy names each origin that talks to the bucket
(`http://localhost:3000` in development, the production domain once deployed),
allows `PUT` for the upload and `GET`/`HEAD` for playback, and lists
`content-type` among the allowed headers because the URL is signed for a
specific content type and the client has to send a matching header.

It is set by hand, once, from the dashboard or `wrangler r2 bucket cors set`.
The app's own token is deliberately **Object** Read & Write rather than Admin,
so a leaked application key cannot rewrite the bucket's configuration.

### Playback authorisation

The lesson page already decides whether the viewer may watch. That same decision
now gates URL minting: when the viewer is entitled, the server mints a presigned
`GET` for `videoKey` and passes it to the client component as a prop. When they
are not, no URL is ever created.

There is nothing to revoke. Revocation is the absence of minting.

Expiry is six hours. It has to outlast the longest lesson plus pauses or
playback dies mid-video; R2 permits up to seven days, which would defeat the
point. Six hours covers a viewing session and still means a leaked URL is dead
the same day.

A page left open past that has a dead URL, and R2 answers an expired presigned
URL with a 403 carrying no CORS headers — so the browser cannot read why it
failed. The player therefore treats any media error the same way: it tells the
viewer to reload, which mints a fresh URL and is the only thing that would help
anyway.

The signed URL must never reach a shared cache. The app runs Next.js 16 with
cached data layers under `db/cache/*`, so the path that mints the URL stays
uncached. This is the one detail in the design that is a correctness bug rather
than a rough edge if it is got wrong: a cached signed URL is one student's
playback token served to another.

### The player

`YouTubeVideoPlayer` is replaced by `LessonVideoPlayer`, a native `<video>`.
Props keep their shape — `src` in place of `videoId`, `onFinishedVideo`
unchanged — so `LessonBody` changes by a couple of lines and the bound server
action in the lesson page is untouched. `onEnded` replaces the check against
YouTube's `ENDED` state.

This deletes rather than adds complexity. The global script loader, the
mount-point swap, and the teardown race documented at length in the current
file all exist to wrangle YouTube's IFrame API, and none of them has an
equivalent here.

`controls`, `preload="metadata"`, and `playsInline` — without the last, iOS
Safari force-fullscreens every video.

### Layout

The wrapper in `LessonBody` moves from `aspect-video` to `aspect-[9/16]`, with
`max-h-[80vh] mx-auto` so a portrait video does not run past the viewport on a
desktop screen. The gold border and rounding stay as they are.

### Encoding standard

One rendition. H.264 High profile and AAC in MP4, 1080×1920, CRF ~23, and
`-movflags +faststart`.

`faststart` is not optional: it moves the file index to the front so playback
can begin before the file has finished downloading. Without it a lesson appears
to hang until the whole video has arrived.

No transcoding pipeline. A documented `ffmpeg` command is run by hand before
upload, which at this catalogue size is honest rather than lazy — a pipeline
would be infrastructure maintained for a handful of files a month. Adaptive
bitrate is skipped for the same reason: the audience is Panama and Spain on
broadly workable connections, and HLS would cost multi-rendition transcoding, a
JS player library, and segment-level signing to buy something they mostly do not
need.

## What this does not solve

A student with legitimate access can still download the file or screen-record it
during the six hours their URL is valid. Nothing prevents that, here or
anywhere. What changes is that access ends when entitlement ends, instead of
never.

## Manual setup

Steps that cannot be done from the repository:

1. Create a Cloudflare account (the free plan is sufficient for R2).
2. Enable R2 and create a private bucket, `nalu-lesson-videos`. Leave public
   access disabled.
3. Create an R2 API token scoped to that bucket with **Object** Read & Write —
   not Admin. Record the access key id, secret access key, and account id.
4. Add a CORS policy allowing `http://localhost:3000` (and later the production
   origin) for `GET`, `PUT` and `HEAD`, with `content-type` in the allowed
   headers.
5. Add `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY` and
   `R2_BUCKET_NAME` to `.env` locally, and to Vercel only once the change has
   been verified locally.
6. Install `ffmpeg` locally for the encoding step.

## Testing

The access boundary is the part worth testing, because it is the part that
carries the whole point of the change: a viewer without entitlement must get no
URL, and a viewer with entitlement must get one that works. That is a server
level test around the minting function rather than anything in the browser.

Beyond it: a presigned URL is rejected after expiry, the migration refuses to
run against a catalogue that still has YouTube ids, and the player calls
`onFinishedVideo` exactly once when a video ends.
