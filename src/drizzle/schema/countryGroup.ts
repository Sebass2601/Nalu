import { relations } from "drizzle-orm";
import { pgTable, real, text } from "drizzle-orm/pg-core";
import { createdAt, id, updatedAt } from "../schemaHelpers";
import { CountryTable } from "./country";

// A group of countries that share a purchasing-power tier. Every country maps
// to exactly one group, and the group carries the recommended PPP discount.
export const CountryGroupTable = pgTable("country_groups", {
    id,
    // Human-readable label, e.g. "Latin America" or "United States & Canada".
    name: text().notNull().unique(),
    // Recommended discount as a fraction between 0 and 1 (e.g. 0.4 = 40% off).
    // Nullable so a group can exist before a discount is decided.
    recommendedDiscountPercentage: real(),
    // Reserved for the future Stripe checkout wiring — the coupon to apply for
    // buyers in this group. Unused while PPP is display-only.
    stripeCouponId: text(),
    createdAt,
    updatedAt,
});

export const CountryGroupRelationships = relations(
    CountryGroupTable,
    ({ many }) => ({
        countries: many(CountryTable),
    })
);
