import { relations } from "drizzle-orm";
import { pgTable, text, uuid } from "drizzle-orm/pg-core";
import { createdAt, id, updatedAt } from "../schemaHelpers";
import { CountryGroupTable } from "./countryGroup";

// A single country, keyed by its ISO 3166-1 alpha-2 code (e.g. "US", "IN").
// This is the code Arcjet returns in `decision.ip.country`, so detection maps
// straight onto this table.
export const CountryTable = pgTable("countries", {
    id,
    name: text().notNull(),
    // Two-letter ISO country code. Unique so a code resolves to one country.
    code: text().notNull().unique(),
    countryGroupId: uuid()
        .notNull()
        .references(() => CountryGroupTable.id, { onDelete: "restrict" }),
    createdAt,
    updatedAt,
});

export const CountryRelationships = relations(CountryTable, ({ one }) => ({
    countryGroup: one(CountryGroupTable, {
        fields: [CountryTable.countryGroupId],
        references: [CountryGroupTable.id],
    }),
}));
