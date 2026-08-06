// Encodes a lesson video to the one format the site plays, then checks the
// result before you spend an upload on it.
//
//   pnpm video:encode ~/Videos/mi-clase.mov
//   pnpm video:encode ~/Videos/mi-clase.mov ~/Videos/clase-1.mp4
//
// The settings are not adjustable on purpose. Three of them are the difference
// between a lesson that works and one that only works for you:
//
//   libx264 / aac   every browser can decode these. A file can end in .mp4 and
//                   still hold H.265 from a recent phone, which simply will not
//                   play for some people.
//   +faststart      moves the file's index to the front. Without it the browser
//                   must download the whole file before it can play a second of
//                   it — invisible on a fast connection, minutes of black
//                   screen on a phone.
//   1080x1920       the player frame is portrait and fixed.
//
// Verification is the point as much as the encoding is. faststart in particular
// fails silently, and the only symptom is someone else's bad afternoon.

import { execFile, spawn } from "node:child_process";
import { existsSync, openSync, readSync, closeSync, statSync } from "node:fs";
import { basename, dirname, extname, join, resolve } from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

const WIDTH = 1080;
const HEIGHT = 1920;

function fail(message) {
    console.error(`\n✗ ${message}\n`);
    process.exit(1);
}

function formatSize(bytes) {
    if (bytes >= 1024 ** 3) return `${(bytes / 1024 ** 3).toFixed(2)} GB`;
    if (bytes >= 1024 ** 2) return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
    return `${(bytes / 1024).toFixed(0)} KB`;
}

function formatDuration(seconds) {
    const total = Math.round(seconds);
    const minutes = Math.floor(total / 60);
    return `${minutes}m ${String(total % 60).padStart(2, "0")}s`;
}

async function requireTool(name) {
    try {
        await execFileAsync(name, ["-version"]);
    } catch {
        fail(`${name} is not installed. Run: sudo apt install ffmpeg`);
    }
}

async function probe(file) {
    const { stdout } = await execFileAsync("ffprobe", [
        "-v", "error",
        "-print_format", "json",
        "-show_format",
        "-show_streams",
        file,
    ]);

    const data = JSON.parse(stdout);
    const video = data.streams.find(s => s.codec_type === "video");
    const audio = data.streams.find(s => s.codec_type === "audio");

    return { video, audio, duration: Number(data.format.duration) };
}

// Walks the MP4 box structure from the front, looking for whether the index
// (`moov`) appears before the media data (`mdat`).
//
// Parsed rather than grepped: `ffprobe -v trace` prints the offset, but reading
// it back out means depending on the wording of a debug log. The container
// format itself is stable — 4 bytes of big-endian size, 4 bytes of type, repeat
// — so this reads what the browser reads.
function moovComesFirst(file) {
    const fd = openSync(file, "r");

    try {
        const header = Buffer.alloc(16);
        let offset = 0;
        const end = statSync(file).size;

        while (offset < end) {
            const read = readSync(fd, header, 0, 16, offset);
            if (read < 8) return false;

            let size = header.readUInt32BE(0);
            const type = header.toString("ascii", 4, 8);

            if (type === "moov") return true;
            if (type === "mdat") return false;

            // size 1 means the real, 64-bit size sits in the next 8 bytes.
            if (size === 1) size = Number(header.readBigUInt64BE(8));
            // size 0 means "to end of file" — nothing follows to look at.
            if (size === 0) return false;
            if (size < 8) return false;

            offset += size;
        }

        return false;
    } finally {
        closeSync(fd);
    }
}

function runFfmpeg(input, output) {
    const args = [
        "-y",
        "-i", input,
        "-vf",
        `scale=${WIDTH}:${HEIGHT}:force_original_aspect_ratio=decrease,` +
            `pad=${WIDTH}:${HEIGHT}:(ow-iw)/2:(oh-ih)/2`,
        "-c:v", "libx264",
        "-profile:v", "high",
        "-crf", "23",
        "-preset", "slow",
        "-c:a", "aac",
        "-b:a", "128k",
        "-movflags", "+faststart",
        output,
    ];

    return new Promise((resolvePromise, rejectPromise) => {
        // stdio inherited so ffmpeg's progress line lands on the terminal as it
        // happens. A long encode with no output looks like a hang.
        const child = spawn("ffmpeg", ["-hide_banner", "-loglevel", "warning", "-stats", ...args], {
            stdio: "inherit",
        });

        child.on("error", rejectPromise);
        child.on("close", code =>
            code === 0
                ? resolvePromise()
                : rejectPromise(new Error(`ffmpeg exited with code ${code}`))
        );
    });
}

async function main() {
    const [inputArg, outputArg] = process.argv.slice(2);

    if (!inputArg) {
        console.error("Usage: pnpm video:encode <input> [output.mp4]");
        process.exit(1);
    }

    await requireTool("ffmpeg");
    await requireTool("ffprobe");

    const input = resolve(inputArg);
    if (!existsSync(input)) fail(`No such file: ${input}`);

    // Derived rather than overwritten: an input that is already .mp4 would
    // otherwise be destroyed by its own encode.
    const output = outputArg
        ? resolve(outputArg)
        : join(dirname(input), `${basename(input, extname(input))}-lesson.mp4`);

    if (output === input) fail("The output would overwrite the input. Give a different name.");

    const source = await probe(input);
    if (source.video == null) fail("That file has no video stream.");

    console.log(`\nsource:  ${basename(input)}`);
    console.log(`         ${source.video.width}x${source.video.height}, ${source.video.codec_name}, ${formatDuration(source.duration)}`);
    if (source.audio == null) console.log("         no audio track");

    if (source.video.width > source.video.height) {
        console.log(
            `\n⚠ This video is horizontal. It will still work, but the player\n` +
            `  frame is portrait, so it will sit small between black bands.`
        );
    }

    console.log(`\nencoding to ${basename(output)} — this takes a while, roughly the length of the video\n`);

    try {
        await runFfmpeg(input, output);
    } catch (error) {
        fail(`Encoding failed: ${error.message}`);
    }

    // Everything below checks the file we just made, rather than assuming the
    // flags did what they say.
    const result = await probe(output);
    const bytes = statSync(output).size;
    const problems = [];

    if (result.video?.codec_name !== "h264") {
        problems.push(`video is ${result.video?.codec_name}, not h264`);
    }
    if (result.video?.width !== WIDTH || result.video?.height !== HEIGHT) {
        problems.push(`size is ${result.video?.width}x${result.video?.height}, not ${WIDTH}x${HEIGHT}`);
    }
    if (source.audio != null && result.audio?.codec_name !== "aac") {
        problems.push(`audio is ${result.audio?.codec_name}, not aac`);
    }
    if (!moovComesFirst(output)) {
        problems.push("faststart did not apply — the video would not start until fully downloaded");
    }

    const gb = bytes / 1024 ** 3;

    console.log(`\nresult:  ${basename(output)}`);
    console.log(`         ${result.video?.width}x${result.video?.height}, ${result.video?.codec_name}, ${formatSize(bytes)}`);
    console.log(`         faststart: ${moovComesFirst(output) ? "yes" : "NO"}`);
    console.log(`         storage:   about $${(gb * 0.015).toFixed(2)}/month in R2`);

    if (problems.length > 0) {
        console.error("\n✗ Not ready to upload:");
        for (const problem of problems) console.error(`   - ${problem}`);
        console.error("");
        process.exit(1);
    }

    console.log(`\n✓ Ready to upload.\n`);
    console.log(`  ${output}\n`);
}

main().catch(error => {
    console.error(error);
    process.exit(1);
});
