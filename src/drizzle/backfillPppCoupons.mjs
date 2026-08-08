// Backfills the Stripe coupon for every country group that already has a
// discount but no coupon yet.
//
//   node --env-file=.env src/drizzle/backfillPppCoupons.mjs   (or: pnpm db:backfill-coupons)
//
// Country groups were seeded before Stripe existed in this project, so their
// `stripeCouponId` is null while `recommendedDiscountPercentage` is set. Saving
// a group in the admin UI now provisions its coupon automatically, but that
// would mean re-saving every group by hand — this does the same thing in one
// pass.
//
// Written as plain .mjs for the same reason as seed.mjs: it runs with zero extra
// tooling, talking to Postgres through the `pg` driver already in the project
// rather than the `@/` aliases and typed-env layer a .ts script would need a
// bundler to resolve. It therefore duplicates the small amount of coupon logic
// in src/app/features/countryGroups/lib/pppCoupons.ts — keep the two in step.
//
// Idempotent: re-running finds the coupons it made last time and changes
// nothing.

import { Client } from "pg";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

function toPercentOff(discountFraction) {
    if (discountFraction == null) return null;
    const percentOff = Math.round(discountFraction * 100);
    // 0% is rejected by Stripe; 100% would give the catalogue away.
    if (percentOff <= 0 || percentOff >= 100) return null;
    return percentOff;
}

async function ensurePppCoupon(percentOff) {
    const couponId = `ppp-${percentOff}`;

    try {
        const existing = await stripe.coupons.retrieve(couponId);
        return { id: existing.id, created: false };
    } catch (error) {
        if (error?.code !== "resource_missing") throw error;
    }

    const created = await stripe.coupons.create({
        id: couponId,
        percent_off: percentOff,
        // "once" (the default) would discount only a subscription's first
        // invoice and charge full price on every renewal.
        duration: "forever",
        name: `PPP ${percentOff}%`,
    });

    return { id: created.id, created: true };
}

async function main() {
    if (!process.env.STRIPE_SECRET_KEY) {
        throw new Error("STRIPE_SECRET_KEY is not set — check your .env file.");
    }

    const client = new Client({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        port: process.env.DB_PORT ?? 5432,
    });
    await client.connect();

    const { rows: groups } = await client.query(
        `SELECT "id", "name", "recommendedDiscountPercentage"
         FROM "country_groups"
         WHERE "recommendedDiscountPercentage" IS NOT NULL`
    );

    let createdCount = 0;
    let linkedCount = 0;
    let skippedCount = 0;

    for (const group of groups) {
        const percentOff = toPercentOff(group.recommendedDiscountPercentage);

        // A 0% group (e.g. the US/Western Europe tier) correctly gets no
        // coupon. Null it out so a stale ID can never linger on a group whose
        // discount was later removed.
        if (percentOff == null) {
            await client.query(
                `UPDATE "country_groups"
                 SET "stripeCouponId" = NULL, "updatedAt" = now()
                 WHERE "id" = $1`,
                [group.id]
            );
            skippedCount++;
            console.log(`- ${group.name}: no discount, no coupon`);
            continue;
        }

        const { id: couponId, created } = await ensurePppCoupon(percentOff);
        if (created) createdCount++;

        await client.query(
            `UPDATE "country_groups"
             SET "stripeCouponId" = $1, "updatedAt" = now()
             WHERE "id" = $2`,
            [couponId, group.id]
        );
        linkedCount++;

        console.log(
            `- ${group.name}: ${percentOff}% -> ${couponId}${created ? " (created)" : ""}`
        );
    }

    await client.end();
    console.log(
        `\nLinked ${linkedCount} group(s) to coupons (${createdCount} newly created in Stripe), ${skippedCount} with no discount.`
    );
}

main().catch(err => {
    console.error("Coupon backfill failed:", err);
    process.exit(1);
});
