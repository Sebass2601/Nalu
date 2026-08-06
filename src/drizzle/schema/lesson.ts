import { integer, pgEnum, pgTable, text, uuid } from "drizzle-orm/pg-core";
import { createdAt, id, updatedAt } from "../schemaHelpers";
import { CourseSectionTable } from "./courseSection";
import { relations } from "drizzle-orm";
import { UserLessonCompleteTable } from "./userLessonComplete";
import { ImageLessonTable } from "./imageLesson";


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
    // The R2 object key, not a URL. Keys are safe to cache and safe to log; the
    // signed URL built from one is neither, which is why only the key is stored
    // and the URL is minted per request against the viewer's entitlement.
    //
    // Nullable, which preserves the existing allowance that a video lesson can
    // be saved before its video exists.
    videoKey: text(),
    // Not needed to play the video. Needed to show lesson length in the course
    // outline, and it is the denominator for any watch-progress work that
    // follows. One nullable column now is cheaper than a migration later.
    videoDurationSeconds: integer(),
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
        images: many(ImageLessonTable),
    }),
    
);