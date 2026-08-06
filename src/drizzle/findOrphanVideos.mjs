// Finds lesson videos sitting in R2 that no lesson points at any more.
//
//   node --env-file=.env src/drizzle/findOrphanVideos.mjs          (or: pnpm r2:orphans)
//   node --env-file=.env src/drizzle/findOrphanVideos.mjs --delete
//
// Three things leave an object behind, and none of them are bugs:
//
//   1. Replacing a lesson's video. Each upload gets a fresh random key on
//      purpose, so URLs already signed against the old one keep working until
//      they expire rather than suddenly serving different content. The
//      superseded object stays.
//   2. Deleting a lesson. Nothing in the delete path touches R2.
//   3. Deleting a section or a course. Postgres cascades the lesson rows away
//      without any application code running at all.
//
// Nothing is lost by letting these accumulate — storage is $0.015/GB-month and
// egress is free — which is exactly why this exists as a script you run when
// you feel like it rather than as cleanup wired into every delete path. It also
// works retroactively, so orphans created before it existed are still found.
//
// Read-only unless you pass --delete. Without it, the keys are printed for you
// to remove in the Cloudflare dashboard.
//
// Written as plain .mjs for the same reason as seed.mjs and
// backfillPppCoupons.mjs: it runs with zero extra tooling, talking to Postgres
// through the `pg` driver already in the project rather than the `@/` aliases
// and typed-env layer a .ts script would need a bundler to resolve.
//
// Run it against whichever database owns the bucket you are pointed at. The
// R2_* variables and the DB_* variables must describe the same environment —
// diffing production's bucket against a local database would report every live
// video as an orphan.

import { Client } from "pg";
import {
    DeleteObjectsCommand,
    ListObjectsV2Command,
    S3Client,
} from "@aws-sdk/client-s3";

const shouldDelete = process.argv.includes("--delete");

const s3 = new S3Client({
    region: "auto",
    endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
    },
});

const BUCKET = process.env.R2_BUCKET_NAME;

// R2 returns at most 1000 keys per call, so a catalogue of any size needs the
// continuation token. Stopping at the first page would silently report a
// partial answer, which for a script whose whole job is "what is not
// referenced" would be worse than no answer at all.
async function listAllObjects() {
    const objects = [];
    let continuationToken;

    do {
        const page = await s3.send(
            new ListObjectsV2Command({
                Bucket: BUCKET,
                Prefix: "lessons/",
                ContinuationToken: continuationToken,
            })
        );

        objects.push(...(page.Contents ?? []));
        continuationToken = page.NextContinuationToken;
    } while (continuationToken);

    return objects;
}

function formatSize(bytes) {
    if (bytes >= 1024 ** 3) return `${(bytes / 1024 ** 3).toFixed(2)} GB`;
    if (bytes >= 1024 ** 2) return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
    return `${(bytes / 1024).toFixed(0)} KB`;
}

async function main() {
    for (const name of [
        "R2_ACCOUNT_ID",
        "R2_ACCESS_KEY_ID",
        "R2_SECRET_ACCESS_KEY",
        "R2_BUCKET_NAME",
    ]) {
        if (!process.env[name]) {
            console.error(`Missing ${name}. Run with --env-file=.env`);
            process.exit(1);
        }
    }

    const client = new Client({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        port: process.env.DB_PORT ?? 5432,
    });
    await client.connect();

    try {
        const { rows } = await client.query(
            `select id, name, "videoKey" from lessons where "videoKey" is not null`
        );

        const liveKeys = new Set(rows.map(row => row.videoKey));
        const objects = await listAllObjects();

        console.log(`bucket:            ${BUCKET}`);
        console.log(`objects in bucket: ${objects.length}`);
        console.log(`lessons with video: ${rows.length}`);
        console.log("");

        const orphans = objects.filter(object => !liveKeys.has(object.Key));

        // The inverse check, which is the more alarming of the two: a lesson
        // whose video is gone from the bucket is a lesson that will not play.
        // Worth surfacing even though this script cannot fix it.
        const bucketKeys = new Set(objects.map(object => object.Key));
        const missing = rows.filter(row => !bucketKeys.has(row.videoKey));

        if (missing.length > 0) {
            console.log("⚠ lessons whose video is NOT in the bucket:");
            for (const row of missing) {
                console.log(`   ${row.name} (${row.id})`);
                console.log(`      expects ${row.videoKey}`);
            }
            console.log("");
        }

        if (orphans.length === 0) {
            console.log("No orphans. Nothing to clean up.");
            return;
        }

        const totalBytes = orphans.reduce(
            (sum, object) => sum + (object.Size ?? 0),
            0
        );

        console.log(`${orphans.length} orphaned object(s), ${formatSize(totalBytes)} total`);
        console.log(
            `costing about $${((totalBytes / 1024 ** 3) * 0.015).toFixed(2)}/month to keep\n`
        );

        for (const object of orphans) {
            const modified = object.LastModified?.toISOString().slice(0, 10) ?? "";
            console.log(`   ${object.Key}`);
            console.log(`      ${formatSize(object.Size ?? 0)}   uploaded ${modified}`);
        }

        if (!shouldDelete) {
            console.log("\nDelete these in the Cloudflare dashboard, or re-run with --delete.");
            return;
        }

        // DeleteObjects takes at most 1000 keys per request.
        console.log("\nDeleting...");
        for (let i = 0; i < orphans.length; i += 1000) {
            const batch = orphans.slice(i, i + 1000);
            await s3.send(
                new DeleteObjectsCommand({
                    Bucket: BUCKET,
                    Delete: { Objects: batch.map(o => ({ Key: o.Key })) },
                })
            );
        }
        console.log(`Deleted ${orphans.length} object(s).`);
    } finally {
        await client.end();
    }
}

main().catch(error => {
    console.error(error);
    process.exit(1);
});
