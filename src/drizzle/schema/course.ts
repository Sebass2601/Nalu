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
    // Optional cover art, stored as the URL that UploadThing hands back. Nullable
    // unlike a product's image: a product IS the thing being sold and must have a
    // picture, while a course is content that reads perfectly well as text alone.
    imageUrl: text(),
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
    // Whether material is still being added to this course week by week, as
    // opposed to a finished course that is complete on the day it is bought.
    // Drawn as a tag on every card the course appears on, and on the cards of
    // the products that bundle it.
    //
    // Nullable rather than `notNull().default(false)`, which is the one place
    // this column differs from `includedInSubscription` above. Null is not a
    // third state: it means the same thing as false to every reader, and exists
    // only because the courses that predate this column were never asked the
    // question. Anything written through the admin form is a true boolean.
    uploadedWeekly: boolean(),
    // Whether this course is one of the free classes shown on /clases-gratuitas.
    //
    // Free content is readable by anyone, signed in or not — the flag is the
    // first thing `userHasCourseAccess` checks, before it has even asked who is
    // asking. That is the whole reason it is a column and not a name: the page
    // it feeds used to find its course by matching `name` against a constant,
    // which meant a rename in the admin panel silently emptied the page.
    //
    // Mutually exclusive with `includedInSubscription` above, and enforced in
    // the form's schema rather than here: a course already given away cannot
    // also be a reason to subscribe. Free courses are filtered out of the
    // subscription rows, the per-category subscription pages and "Mis cursos" —
    // progress through them is still recorded, but /clases-gratuitas is the only
    // place it is shown.
    //
    // `notNull().default(false)` like `includedInSubscription`, and unlike the
    // nullable `uploadedWeekly`: every course that predates this column really
    // is not free content, so false is a true answer for all of them rather
    // than a stand-in for an unasked question.
    freeContent: boolean().notNull().default(false),
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
