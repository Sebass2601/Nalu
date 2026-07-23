import { integer, pgEnum, pgTable, text, uuid } from "drizzle-orm/pg-core";
import { createdAt, id, updatedAt } from "../schemaHelpers";
import { CourseSectionTable } from "./courseSection";
import { relations } from "drizzle-orm";
import { UserLessonCompleteTable } from "./userLessonComplete";


export const lessonStatuses = ["public", "private", "preview"] as const;
export type LessonStatus = (typeof lessonStatuses)[number];
export const LessonStatusEnum = pgEnum(
    "lesson_status",
    lessonStatuses
);

export const lessonTypes = ["video", "text"] as const;
export type LessonType = (typeof lessonTypes)[number];
export const LessonTypeEnum = pgEnum(
    "lesson_type",
    lessonTypes
);

export const LessonTable = pgTable("lessons", {
    id,
    name: text().notNull(),
    description: text(),
    type: LessonTypeEnum().notNull().default("video"),
    youtubeVideoId: text(),
    content: text(),
    order: integer().notNull(),
    status: LessonStatusEnum().notNull().default("private"),
    sectionId: uuid()
        .notNull()
        .references(() => CourseSectionTable.id, { onDelete: "cascade" }),
    createdAt,
    updatedAt,
});

export const LessonRelationship = relations(
    LessonTable,
    ({ many, one }) => ({
        section: one(CourseSectionTable, {
            fields: [LessonTable.sectionId],
            references: [CourseSectionTable.id],
        }),
        userLessonsComplete: many(UserLessonCompleteTable),
    }),
    
);