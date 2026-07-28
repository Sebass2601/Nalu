import { relations } from "drizzle-orm";
import { boolean, pgTable, text, uuid } from "drizzle-orm/pg-core";
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
    // Whether an active subscriber can read this course without buying it.
    // Courses stay OUT of the subscription by default, so a new course is never
    // given away by accident — including it is always a deliberate act.
    //
    // Subscription access is computed from this flag at read time rather than
    // written into user_course_access, which is what makes toggling it a single
    // UPDATE instead of a backfill across every subscriber. It also means a
    // course removed from the subscription is still owned by anyone who bought
    // it outright: purchases and subscriptions are checked independently.
    includedInSubscription: boolean().notNull().default(false),
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
