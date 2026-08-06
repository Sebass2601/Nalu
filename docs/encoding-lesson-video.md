# Encoding a lesson video

Every lesson video is encoded by hand before it is uploaded in the admin lesson
form. There is no transcoding pipeline in the app — at this catalogue size one
would be infrastructure maintained for a handful of files a month.

## The command

```bash
ffmpeg -i input.mov \
  -vf "scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2" \
  -c:v libx264 -profile:v high -crf 23 -preset slow \
  -c:a aac -b:a 128k \
  -movflags +faststart \
  output.mp4
```

## Why each part is there

**`-movflags +faststart` is not optional.** It moves the file's index (the
`moov` atom) from the end of the file to the front. Without it the browser
cannot start playing until the whole file has arrived, so a lesson appears to
hang for as long as the download takes. With it, playback begins almost
immediately and seeking works against the parts already fetched.

**`scale` + `pad`** fits any source into the 1080×1920 portrait frame without
distorting it: the picture is scaled down until it fits, then centred with bars
filling whatever is left. Footage already shot 9:16 passes through untouched.
The player's frame is `aspect-9/16`, so anything else would be letterboxed by
the browser instead — better to decide the framing here, where you can see it.

**`-c:v libx264 -profile:v high`** is H.264, which every browser plays. Newer
codecs compress better but are not universally supported, and video that will
not play is worse than video that is slightly larger.

**`-crf 23`** is quality-targeted rather than bitrate-targeted: the encoder
spends whatever bits each scene needs to hit that quality. Lower is better and
larger — 18 is near-transparent, 28 is visibly soft. 23 is a reasonable middle
for talking-head and screen-recorded material.

**`-preset slow`** makes the encoder work harder for a smaller file at the same
quality. It only costs your time once, at encode; every viewer benefits.

**`-c:a aac -b:a 128k`** is the audio equivalent of H.264 — universally
supported, and 128 kbps is more than enough for speech.

## Checking the result before uploading

```bash
ffprobe -v error -show_entries format=duration,size:stream=codec_name,width,height \
  -of default=noprint_wrappers=1 output.mp4
```

Expect `width=1080`, `height=1920`, `codec_name=h264` and `codec_name=aac`.

To confirm `faststart` actually applied — the `moov` atom should appear near the
start of the file, not the end:

```bash
ffprobe -v trace output.mp4 2>&1 | grep -m1 "type:'moov'"
```

## Size

Roughly 0.9 GB per hour of video at these settings, varying with how much motion
the footage has. Storage is billed at $0.015/GB-month and egress is free, so a
hundred hours costs about $1.35 a month to keep.
