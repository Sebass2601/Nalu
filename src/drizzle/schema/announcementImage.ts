import { integer, pgTable, text, uuid } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createdAt, id, updatedAt } from "../schemaHelpers";
import { AnnouncementTable } from "./announcement";

// The pictures inside one announcement, in the order they are shown.
//
// Column for column the same as `lesson_images`, because the layout that draws
// them is the same component. `caption` is the words that travel with a picture;
// `order` is the position the admin dragged it to.
//
// `onDelete: "cascade"` so removing an announcement takes its images' rows with
// it. The files themselves are deleted separately, by the code that owns the
// upload storage — a foreign key can tidy the database but knows nothing about
// UploadThing.
export const AnnouncementImageTable = pgTable("announcement_images", {
    id,
    url: text().notNull(),
    caption: text(),
    order: integer().notNull(),
    announcementId: uuid()
        .notNull()
        .references(() => AnnouncementTable.id, { onDelete: "cascade" }),
    createdAt,
    updatedAt,
});

export const AnnouncementImageRelationships = relations(
    AnnouncementImageTable,
    ({ one }) => ({
        announcement: one(AnnouncementTable, {
            fields: [AnnouncementImageTable.announcementId],
            references: [AnnouncementTable.id],
        }),
    })
);
