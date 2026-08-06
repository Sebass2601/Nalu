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
    // The video's own dimensions, so the page can shape its frame to the
    // picture instead of assuming one.
    //
    // Read at upload time rather than derived at render: the browser only
    // learns a video's size once it has loaded metadata, which is well after
    // the frame has to be laid out. Without these the box would be sized wrong
    // and then jump when the video arrived.
    //
    // Nullable because rows uploaded before this existed have no answer. The
    // renderer falls back to 9:16 for those.
    videoWidth: integer(),
    videoHeight: integer(),
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