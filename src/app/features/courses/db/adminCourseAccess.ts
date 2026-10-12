import "server-only";

import { db } from "@/drizzle/db";
import {
    CourseTable,
    UserCourseAccessTable,
    UserTable,
} from "@/drizzle/schema";
import { and, asc, count, desc, eq, ilike, isNull, sql } from "drizzle-orm";
import { cacheTag } from "next/cache";
import { getCourseGlobalTag } from "./cache/courses";
import { getUSerCourseAccessGlobalTag } from "./cache/userCourseAccess";
import { getUserGlobalTag } from "@/app/features/users/db/cache/users";
import { accessOrigin, type CourseAccessOrigin } from "../lib/courseAccessGrant";

// Reads behind the admin access screens.
//
// All of them are tagged with the userCourseAccess global tag as well as the
// users one, because these results copy a person's name and email out of their
// account row: renaming an account has to move the name here too, exactly as it
// does for the sales list.

export type CourseAccessSummary = {
    id: string;
    name: string;
    includedInSubscription: boolean;
    accessCount: number;
};

// Every course, with how many people hold a row for it.
//
// A LEFT JOIN, not an inner one: a course nobody has access to yet is precisely
// the course an admin came here to grant, so it has to appear with a zero
// rather than vanish from the list.
//
// The count deliberately does NOT include subscribers. Their access is computed
// live from `includedInSubscription` and never written to this table, so there
// is no row here to count. `includedInSubscription` is returned alongside so the
// screen can say that out loud instead of letting a 0 imply nobody can watch.
export async function getCoursesWithAccessCounts(): Promise<
    CourseAccessSummary[]
> {
    "use cache";
    cacheTag(getCourseGlobalTag(), getUSerCourseAccessGlobalTag());

    return db
        .select({
            id: CourseTable.id,
            name: CourseTable.name,
            includedInSubscription: CourseTable.includedInSubscription,
            accessCount: count(UserCourseAccessTable.userId),
        })
        .from(CourseTable)
        .leftJoin(
            UserCourseAccessTable,
            eq(UserCourseAccessTable.courseId, CourseTable.id)
        )
        .groupBy(
            CourseTable.id,
            CourseTable.name,
            CourseTable.includedInSubscription
        )
        .orderBy(asc(CourseTable.name));
}

export type CourseAccessEntry = {
    userId: string;
    name: string;
    email: string;
    origin: CourseAccessOrigin;
    grantedAt: Date;
};

// Everyone holding a row for one course, newest grant first.
//
// Buyers and hand-granted accounts come back in the same list — the admin asked
// to see people who already have access, whatever the reason — but each carries
// its origin, which is what decides whether the screen offers to remove it.
export async function getCourseAccessList(
    courseId: string
): Promise<CourseAccessEntry[]> {
    "use cache";
    cacheTag(getUSerCourseAccessGlobalTag(), getUserGlobalTag());

    const rows = await db
        .select({
            userId: UserTable.id,
            name: UserTable.name,
            email: UserTable.email,
            grantedBy: UserCourseAccessTable.grantedBy,
            grantedAt: UserCourseAccessTable.createdAt,
        })
        .from(UserCourseAccessTable)
        .innerJoin(UserTable, eq(UserTable.id, UserCourseAccessTable.userId))
        .where(
            and(
                eq(UserCourseAccessTable.courseId, courseId),
                // A deleted account keeps its access rows through the soft
                // delete, but showing it would offer the admin a person who is
                // no longer there to manage.
                isNull(UserTable.deletedAt)
            )
        )
        .orderBy(desc(UserCourseAccessTable.createdAt));

    return rows.map(row => ({
        userId: row.userId,
        name: row.name,
        email: row.email,
        origin: accessOrigin(row),
        grantedAt: row.grantedAt,
    }));
}

// The course itself, for the heading on its access page.
export async function getCourseForAccess(courseId: string) {
    "use cache";
    cacheTag(getCourseGlobalTag());

    return db.query.CourseTable.findFirst({
        columns: { id: true, name: true, includedInSubscription: true },
        where: eq(CourseTable.id, courseId),
    });
}

export type UserSearchResult = {
    id: string;
    name: string;
    email: string;
};

const SEARCH_LIMIT = 10;

// Accounts matching what the admin has typed, for the add-an-account box.
//
// Matched on the account's name — the one its owner registered with and the
// one shown for them across the platform — and never on the email. The email
// still comes back with each result, because names are not unique the way
// addresses are: it is what tells apart two accounts registered under the same
// name, and granting access to the wrong one of them is the mistake this box
// most needs to prevent.
//
// Not cached. It runs per keystroke against a term that is never the same
// twice, so a cache entry here would be written once and read never — all cost,
// no benefit — and it must see an account the moment it is created.
//
// Anyone already holding a row for this course is filtered out rather than
// shown and rejected: offering a name that cannot be picked is a worse answer
// than not offering it.
export async function searchUsersWithoutCourseAccess({
    courseId,
    query,
}: {
    courseId: string;
    query: string;
}): Promise<UserSearchResult[]> {
    const term = query.trim();

    if (term.length === 0) return [];

    const alreadyHasAccess = db
        .select({ one: sql`1` })
        .from(UserCourseAccessTable)
        .where(
            and(
                eq(UserCourseAccessTable.courseId, courseId),
                eq(UserCourseAccessTable.userId, UserTable.id)
            )
        );

    return db
        .select({
            id: UserTable.id,
            name: UserTable.name,
            email: UserTable.email,
        })
        .from(UserTable)
        .where(
            and(
                // `ilike` because nobody types a name with the capitals its
                // owner chose, and a match anywhere in it because an admin is as
                // likely to remember a surname as a first name.
                ilike(UserTable.name, `%${term}%`),
                isNull(UserTable.deletedAt),
                sql`not exists ${alreadyHasAccess}`
            )
        )
        // By name, since that is what was searched. The email breaks ties so
        // accounts sharing a name always come back in the same order instead
        // of whichever one Postgres happened to read first.
        .orderBy(asc(UserTable.name), asc(UserTable.email))
        .limit(SEARCH_LIMIT);
}
