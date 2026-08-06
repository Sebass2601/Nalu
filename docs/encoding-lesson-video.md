# Encoding a lesson video

Every lesson video is encoded before it is uploaded in the admin lesson form.
There is no transcoding pipeline in the app — at this catalogue size one would
be infrastructure maintained for a handful of files a month.

## Use the script

```bash
pnpm video:encode ~/Videos/mi-clase.mov
```

It encodes the file, then checks the result and tells you whether it is safe to
upload. The output lands next to the source as `<name>-lesson.mp4`; the original
is never touched.

The checking is as much the point as the encoding. `faststart` in particular
fails silently — the only symptom is somebody else waiting through a black
screen — so the script verifies it rather than trusting the flag.

## What it does, and why

The command underneath is:

```bash
ffmpeg -i input.mov \
  -vf "scale='min(1080,iw)':'min(1920,ih)':force_original_aspect_ratio=decrease:force_divisible_by=2" \
  -c:v libx264 -profile:v high -crf 23 -preset slow \
  -c:a aac -b:a 128k \
  -movflags +faststart \
  output.mp4
```

**`-movflags +faststart` is not optional.** It moves the file's index (the
`moov` atom) from the end of the file to the front. Without it the browser
cannot start playing until the whole file has arrived, so a lesson appears to
hang for as long as the download takes — and seeking does not work at all until
it finishes. On a fast connection you will never notice; on mobile data it is
minutes of black screen.

**The scale filter fits without padding or enlarging.** Nothing is padded,
because the lesson page shapes its frame to the video's own dimensions —
recorded at upload time and stored on the lesson. Baking black bands into the
file would trap them inside that frame permanently, with the gold border drawn
around the bars instead of the picture. A vertical video gets a vertical frame,
a square one a square frame.

The `min()` calls stop a small source being blown up: scaling to fit inside its
own size does nothing, while a 4K source still comes down to fit 1080×1920.
Enlarging cannot add detail — it only makes the file bigger and the picture
softer.

**`-c:v libx264 -c:a aac`** is what guarantees the video plays everywhere. A
file can end in `.mp4` and still hold H.265 from a recent phone, which simply
will not play for some viewers.

**`-crf 23`** targets a quality rather than a bitrate: the encoder spends
whatever bits each scene needs. Lower is better and larger — 18 is
near-transparent, 28 visibly soft. 23 suits talking-head and screen-recorded
material.

**`-preset slow`** makes the encoder work harder for a smaller file at the same
quality. It costs your time once; every viewer benefits.

## What the script reports

Before encoding, it notes the source's shape and warns if the resolution is low
enough that the result will look soft.

Afterwards it reports the dimensions, codec, size, and whether faststart
applied, ending in either `✓ Ready to upload` or a list of what is wrong. If it
says the video is not ready, do not upload it.

## Size

Roughly 0.9 GB per hour for typical course footage, varying with how much motion
there is. Storage costs $0.015/GB-month and egress is free, so a hundred hours
is about $1.20 a month to keep.
