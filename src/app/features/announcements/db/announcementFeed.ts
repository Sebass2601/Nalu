import "server-only";

import { and, asc, desc, eq } from "drizzle-orm";
import { cacheTag } from "next/cache";
import { db } from "@/drizzle/db";
import { AnnouncementImageTable, AnnouncementTable } from "@/drizzle/schema";
import {
    getAnnouncementGlobalTag,
    getAnnouncementIdTag,
} from "./cache/announcements";

// What a visitor may read. Private announcements are absent from both queries
// rather than filtered out later, which is what makes "unpublished" mean the same
// thing on every page: not there at all, no locked state, no 403.

// Every published announcement, newest first — the list the lateral menu draws.
//
// Ordered by `createdAt` rather than by any position column, because there is no
// position column: an announcement is news, and which is newest is a fact about
// when it was written, not a thing to be arranged.
//
// `createdAt` comes back as part of the row because each tab shows the date
// beside the name. It is formatted by the caller, on the server, so the browser
// never has to agree with us about what day it is.
export async function getPublishedAnnouncements() {
    "use cache";
    cacheTag(getAnnouncementGlobalTag());

    return db.query.AnnouncementTable.findMany({
        columns: { id: true, name: true, createdAt: true },
        where: eq(AnnouncementTable.status, "public"),
        orderBy: desc(AnnouncementTable.createdAt),
    });
}

// One published announcement with its pictures in order — everything the page
// needs to draw it.
//
// Tagged by id as well as globally: editing this announcement's words refreshes
// this entry, and publishing or removing any announcement refreshes it too, since
// the same edit changes the menu that is drawn beside it.
export async function getPublishedAnnouncement(id: string) {
    "use cache";
    cacheTag(getAnnouncementIdTag(id), getAnnouncementGlobalTag());

    return db.query.AnnouncementTable.findFirst({
        columns: {
            id: true,
            name: true,
            content: true,
            createdAt: true,
        },
        where: and(
            eq(AnnouncementTable.id, id),
            eq(AnnouncementTable.status, "public")
        ),
        with: {
            images: {
                columns: { id: true, url: true, caption: true },
                orderBy: asc(AnnouncementImageTable.order),
            },
        },
    });
}
