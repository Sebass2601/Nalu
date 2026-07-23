import { db } from "@/drizzle/db";
import { CountryGroupTable, CountryTable } from "@/drizzle/schema";
import { eq, sql } from "drizzle-orm";
import { cacheTag } from "next/cache";
import { getCountryGroupGlobalTag } from "./cache/countryGroups";
import { revalidateCountryGroupCache } from "./cache/countryGroups";

// Look up the PPP discount for a given ISO country code. Returns null when the
// country isn't mapped or its group has no recommended discount (so callers
// fall back to the full price). Cached and keyed by country code; any change to
// a group's discount busts the whole `countryGroups` tag.
export async function getUserPPPDiscount(countryCode: string) {
    "use cache";
    cacheTag(getCountryGroupGlobalTag());

    const country = await db.query.CountryTable.findFirst({
        where: eq(CountryTable.code, countryCode),
        columns: {},
        with: {
            countryGroup: {
                columns: {
                    name: true,
                    recommendedDiscountPercentage: true,
                },
            },
        },
    });

    const group = country?.countryGroup;
    if (group?.recommendedDiscountPercentage == null) return null;

    return {
        countryGroupName: group.name,
        discountPercentage: group.recommendedDiscountPercentage,
    };
}

// List every country group with how many countries it contains, for the admin
// screen. Cached under the same global tag.
export async function getCountryGroups() {
    "use cache";
    cacheTag(getCountryGroupGlobalTag());

    return db
        .select({
            id: CountryGroupTable.id,
            name: CountryGroupTable.name,
            recommendedDiscountPercentage:
                CountryGroupTable.recommendedDiscountPercentage,
            countryCount: sql<number>`count(${CountryTable.id})`.mapWith(Number),
        })
        .from(CountryGroupTable)
        .leftJoin(
            CountryTable,
            eq(CountryTable.countryGroupId, CountryGroupTable.id)
        )
        .groupBy(CountryGroupTable.id)
        .orderBy(CountryGroupTable.name);
}

// Update one group's recommended discount (fraction 0–1, or null to clear).
// Used by the admin action; busts the country-group cache so prices refresh.
export async function updateCountryGroupDiscount(
    id: string,
    recommendedDiscountPercentage: number | null
) {
    const [updated] = await db
        .update(CountryGroupTable)
        .set({ recommendedDiscountPercentage })
        .where(eq(CountryGroupTable.id, id))
        .returning();

    if (updated == null) throw new Error("No se encontró el grupo de países.");

    revalidateCountryGroupCache();

    return updated;
}
