import { integer, pgTable, text, uuid } from "drizzle-orm/pg-core";
import { createdAt, id, updatedAt } from "../schemaHelpers";
import { LessonTable } from "./lesson";
import { relations } from "drizzle-orm";

export const ImageLessonTable = pgTable("lesson_images", {
    id,
    url: text().notNull(),
    caption: text(),
    order: integer().notNull(),
    lessonId: uuid()
        .notNull()
        .references(() => LessonTable.id, { onDelete: "cascade" }),
    createdAt,
    updatedAt,
});

export const ImageLessonRelationships = relations(ImageLessonTable, ({ one }) => ({
    lesson: one(LessonTable, {
        fields: [ImageLessonTable.lessonId],
        references: [LessonTable.id],
    }),
}));
