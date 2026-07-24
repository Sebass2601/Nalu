import { relations } from "drizzle-orm";
import { pgTable, text, uuid } from "drizzle-orm/pg-core";
import { createdAt, id, updatedAt } from "../schemaHelpers";
import { CourseProductTable } from "./courseProduct";
import { UserCourseAccessTable } from "./userCourseAccess";
import { CourseSectionTable } from "./courseSection";
import { CategoryTable } from "./category";



export const CourseTable = pgTable("courses", {
    id,
    name: text().notNull(),
    description: text().notNull(),
    // Which category this course belongs to. Nullable so existing courses keep
    // working, and "set null" so deleting a category simply un-categorizes its
    // courses instead of blocking the delete or removing the courses.
    categoryId: uuid().references(() => CategoryTable.id, {
        onDelete: "set null",
    }),
    createdAt,
    updatedAt,
});

export const CourseRelationships = relations(
    CourseTable,
    ({ many, one }) => ({
    courseProducts: many(CourseProductTable),
    userCourseAccesses: many(UserCourseAccessTable),
    courseSections: many(CourseSectionTable),
    category: one(CategoryTable, {
        fields: [CourseTable.categoryId],
        references: [CategoryTable.id],
    }),
}));
