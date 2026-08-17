import { pgEnum, pgTable, text } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createdAt, id, updatedAt } from "../schemaHelpers";
import { AnnouncementImageTable } from "./announcementImage";

// Published or still being written. The same two words a course section uses, and
// for the same reason: an announcement is either on the site or it is not, and
// there is no third state worth a column.
//
// Its own enum type rather than a shared one, because a Postgres enum belongs to
// the table it constrains — reusing `course_section_status` here would tie the
// two features' futures together for the sake of saving a type.
export const announcementStatuses = ["public", "private"] as const;
export type AnnouncementStatus = (typeof announcementStatuses)[number];
export const AnnouncementStatusEnum = pgEnum(
    "announcement_status",
    announcementStatuses
);

// One notice on /announcements: a heading, a piece of writing, and the pictures
// set into it.
//
// Shaped after a text lesson, which is what it is in every way that matters to a
// reader — and deliberately NOT stored as one. A lesson belongs to a section
// which belongs to a course, and an announcement belongs to nothing; hanging
// these off a fake course would mean a row in the catalogue that must be hidden
// from every page that lists courses.
//
// There is no `order` column. Announcements are read newest first, and `createdAt`
// already says which that is — a position column would be a second, editable
// answer to a question the timestamp already answers correctly.
export const AnnouncementTable = pgTable("announcements", {
    id,
    name: text().notNull(),
    // Nullable, like a lesson's body: the admin form saves a name and a status
    // before there is anything to read, and a draft with no words in it yet is a
    // normal stage of writing rather than an error.
    content: text(),
    // Private by default, so publishing is always something someone chose to do.
    status: AnnouncementStatusEnum().notNull().default("private"),
    createdAt,
    updatedAt,
});

export const AnnouncementRelationships = relations(
    AnnouncementTable,
    ({ many }) => ({
        images: many(AnnouncementImageTable),
    })
);
