import { relations, sql } from "drizzle-orm";
import { pgTable, text, uniqueIndex } from "drizzle-orm/pg-core";
import { createdAt, id, updatedAt } from "../schemaHelpers";
import { CourseTable } from "./course";

export const CategoryTable = pgTable(
    "categories",
    {
        id,
        name: text().notNull(),
        description: text(),
        // Which doorway of the castle artwork on the homepage this category
        // sits at, as a HOTSPOTS id. Null means it is not on the castle at
        // all: it stays reachable through /products and the category nav, and
        // its doorway is left as plain artwork.
        //
        // Storing the doorway on the category is what keeps the plaques still.
        // The homepage used to hand out spare doorways in alphabetical order,
        // so adding, renaming or deleting one category shuffled the others onto
        // different doorways; now every plaque is where an admin put it, and
        // nothing but an edit to this column can move it.
        doorway: text(),
        createdAt,
        updatedAt,
    },
    table => [
        // Two categories at one doorway would draw two plaques on top of each
        // other, so the database refuses it. Partial, because "no doorway" is
        // not a claim on anything and any number of categories may sit there.
        uniqueIndex("categories_doorway_unique")
            .on(table.doorway)
            .where(sql`${table.doorway} is not null`),
    ]
);

// One category groups many courses. The matching "belongs to one category"
// side lives on CourseTable via its categoryId column.
export const CategoryRelationships = relations(
    CategoryTable,
    ({ many }) => ({
    courses: many(CourseTable),
}));
