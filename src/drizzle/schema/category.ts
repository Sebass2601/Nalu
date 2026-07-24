import { relations } from "drizzle-orm";
import { pgTable, text } from "drizzle-orm/pg-core";
import { createdAt, id, updatedAt } from "../schemaHelpers";
import { CourseTable } from "./course";

export const CategoryTable = pgTable("categories", {
    id,
    name: text().notNull(),
    description: text(),
    createdAt,
    updatedAt,
});

// One category groups many courses. The matching "belongs to one category"
// side lives on CourseTable via its categoryId column.
export const CategoryRelationships = relations(
    CategoryTable,
    ({ many }) => ({
    courses: many(CourseTable),
}));
