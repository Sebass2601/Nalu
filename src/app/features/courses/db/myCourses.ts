import "server-only";

import { db } from "@/drizzle/db";
import {
    CategoryTable,
    CourseSectionTable,
    CourseTable,
    LessonTable,
    UserCourseAccessTable,
    UserLessonCompleteTable,
} from "@/drizzle/schema";
import { and, eq, inArray } from "drizzle-orm";
import { cacheTag } from "next/cache";
import { getCourseGlobalTag } from "./cache/courses";
import { getCategoryGlobalTag } from "@/app/features/categories/db/cache/categories";
import { getCourseSectionGlobalTag } from "@/app/features/CourseSections/db/cache/courseSections";
import { getLessonGlobalTag } from "@/app/features/lessons/db/cache/lessons";
import { getUSerCourseAccessUserTag } from "./cache/userCourseAccess";
import { getUserLessonCompleteUserTag } from "@/app/features/lessons/db/cache/userLessonComplete";
import { getSubscriptionUserTag } from "@/app/features/subscriptions/db/cache/subscriptions";
import { hasActiveSubscription } from "@/app/features/subscriptions/db/subscriptions";
import { getProductGlobalTag } from "@/app/features/products/db/cache/products";
import { getCheapestPurchasableProductForCourse } from "@/app/features/products/db/products";
import {
    getCompletedLessonCounts,
    getPublishedLessonTotals,
} from "./courseCounts";
import { orderByProgressBand } from "../lib/courseProgressOrder";

export type MyCourse = {
    id: string;
    name: string;
    description: string;
    imageUrl: string | null;
    categoryName: string | null;
    sectionCount: number;
    lessonCount: number;
    completedCount: number;
    // Whether material is still going up week by week. Null on courses that
    // predate the column, and the card treats null and false alike.
    uploadedWeekly: boolean | null;
    // The product to send them to if this course is on the shelf only because
    // they subscribe and something is still selling it. Null for a course they
    // bought — there is nothing left to sell — and null when no public product
    // bundles it. The card reads it as "offer the upgrade, or do not".
    upgradeProductId: string | null;
};

// Everything this person can open from "Mis cursos", with enough about each to
// draw its card.
//
// Two ways in, and they are deliberately NOT the same test:
//
//   1. Bought it. Always listed, finished or untouched. It was paid for once and
//      it stays on the shelf.
//   2. Included in the subscription, AND started. A subscription can cover the
//      whole catalogue, so listing all of it would turn this page into a second
//      copy of the shop — the shelf would fill with courses nobody asked for and
//      the ones actually being worked through would be lost among them. Having
//      finished a lesson is the signal that a subscriber chose this course.
//
// "Started" therefore means at least one completed lesson. It is the only signal
// available: the app records completions, not visits, so a course opened and
// read but never marked stays unstarted. That is a real limitation of the
// underlying data rather than a choice made here.
//
// A course that was bought AND is in the subscription appears once, under rule
// 1, so buying it keeps it on the shelf even before it is started.
export async function getMyCourses(userId: string): Promise<MyCourse[]> {
    "use cache";
    // Who this person is allowed to see, and how far they have got.
    cacheTag(
        getUSerCourseAccessUserTag(userId),
        getUserLessonCompleteUserTag(userId),
        getSubscriptionUserTag(userId)
    );
    // What the courses themselves say — an admin publishing a lesson changes the
    // totals on these cards, and renaming a category changes their labels.
    //
    // Products are in here for the upgrade offer below: unpublishing a product
    // or unlinking a course from it has to take the button off these cards, and
    // without this tag the shelf would keep offering a checkout that no longer
    // exists.
    cacheTag(
        getCourseGlobalTag(),
        getCourseSectionGlobalTag(),
        getLessonGlobalTag(),
        getCategoryGlobalTag(),
        getProductGlobalTag()
    );

    const [purchasedIds, startedIds] = await Promise.all([
        getPurchasedCourseIds(userId),
        getStartedCourseIds(userId),
    ]);

    // Only worth asking about the subscription if there is a started course it
    // could possibly unlock.
    const subscriptionIds =
        startedIds.length > 0 && (await hasActiveSubscription(userId))
            ? await getSubscriptionCourseIds(startedIds)
            : [];

    const visibleIds = [...new Set([...purchasedIds, ...subscriptionIds])];
    if (visibleIds.length === 0) return [];

    const [courses, totals, completed, upgrades] = await Promise.all([
        getCourseCards(visibleIds),
        getPublishedLessonTotals(visibleIds),
        getCompletedLessonCounts({ userId, courseIds: visibleIds }),
        getUpgradeProductIds({ visibleIds, purchasedIds }),
    ]);

    // Sorted here rather than in SQL, because the order depends on a figure
    // SQL has not produced yet: `completedCount` is stitched on in this very
    // map, from a separate query. Ordering the shelf in the database would mean
    // computing the completions twice.
    //
    // The bands are what move — half-read courses to the front, finished ones
    // to the back — and nothing else. `getCourseCards` already returned these
    // in name order and `orderByProgressBand` sorts stably, so each band comes
    // out alphabetical, exactly as the whole shelf used to be.
    return orderByProgressBand(
        courses.map(course => ({
            ...course,
            sectionCount: totals.get(course.id)?.sectionCount ?? 0,
            lessonCount: totals.get(course.id)?.lessonCount ?? 0,
            completedCount: completed.get(course.id) ?? 0,
            upgradeProductId: upgrades.get(course.id) ?? null,
        }))
    );
}

// Which of these cards should offer "buy it for good", and what to sell.
//
// The four conditions `getCourseUpgradeOffer` spells out are already three-
// quarters settled by the time we get here, which is why this does not call it:
// everything on the shelf that was not purchased got here through
// `subscriptionIds`, and that list is only ever populated for a signed-in
// subscriber whose subscription is live and whose courses are in it. Subtracting
// the purchased ids therefore leaves exactly the "access ends with the
// subscription" set, and the only open question is whether anything still sells
// them.
//
// That last question is asked through the same `getCheapestPurchasableProductForCourse`
// the course page and a locked lesson use, so all three resolve to the same
// product at the same price. In parallel rather than in sequence, and each call
// is separately cached — a shelf is a handful of courses, and the alternative is
// a second hand-written copy of that query's public/Hotmart filters and its
// price-then-id tie-break, which is exactly the drift the shared helper exists
// to prevent.
async function getUpgradeProductIds({
    visibleIds,
    purchasedIds,
}: {
    visibleIds: string[];
    purchasedIds: string[];
}) {
    const purchased = new Set(purchasedIds);
    const subscriptionOnlyIds = visibleIds.filter(id => !purchased.has(id));

    const products = await Promise.all(
        subscriptionOnlyIds.map(id => getCheapestPurchasableProductForCourse(id))
    );

    return new Map(
        subscriptionOnlyIds
            .map((id, index) => [id, products[index]?.id] as const)
            .filter((entry): entry is readonly [string, string] =>
                entry[1] != null
            )
    );
}

async function getPurchasedCourseIds(userId: string) {
    const rows = await db
        .select({ courseId: UserCourseAccessTable.courseId })
        .from(UserCourseAccessTable)
        .where(eq(UserCourseAccessTable.userId, userId));

    return rows.map(row => row.courseId);
}

// Courses where this person has completed at least one published lesson. The
// status filters matter: progress against a lesson that was later unpublished
// should not keep a course on the shelf.
async function getStartedCourseIds(userId: string) {
    const rows = await db
        .selectDistinct({ courseId: CourseSectionTable.courseId })
        .from(UserLessonCompleteTable)
        .innerJoin(
            LessonTable,
            and(
                eq(LessonTable.id, UserLessonCompleteTable.lessonId),
                inArray(LessonTable.status, ["public", "preview"])
            )
        )
        .innerJoin(
            CourseSectionTable,
            and(
                eq(CourseSectionTable.id, LessonTable.sectionId),
                eq(CourseSectionTable.status, "public")
            )
        )
        .where(eq(UserLessonCompleteTable.userId, userId));

    return rows.map(row => row.courseId);
}

// Which of the started courses the subscription actually covers. Narrowed to
// those ids rather than asking for every subscription course, because the
// unstarted ones are not going on this page anyway.
async function getSubscriptionCourseIds(startedIds: string[]) {
    const rows = await db
        .select({ id: CourseTable.id })
        .from(CourseTable)
        .where(
            and(
                inArray(CourseTable.id, startedIds),
                eq(CourseTable.includedInSubscription, true)
            )
        );

    return rows.map(row => row.id);
}

async function getCourseCards(courseIds: string[]) {
    return db
        .select({
            id: CourseTable.id,
            name: CourseTable.name,
            description: CourseTable.description,
            imageUrl: CourseTable.imageUrl,
            categoryName: CategoryTable.name,
            uploadedWeekly: CourseTable.uploadedWeekly,
        })
        .from(CourseTable)
        // Left, not inner: a course with no category still belongs on the shelf.
        .leftJoin(CategoryTable, eq(CategoryTable.id, CourseTable.categoryId))
        // Free classes are filtered out here rather than earlier, so the rule
        // sits on the query that decides what the shelf actually draws: it is
        // this list that the returned cards are built from, and an id left in
        // `visibleIds` with no row here simply produces no card.
        //
        // A free class can be bought — nothing stops a product bundling one —
        // and this hides it from the shelf anyway. That is deliberate: its
        // progress is kept, and /newsletter is the one place it is shown.
        .where(
            and(
                inArray(CourseTable.id, courseIds),
                eq(CourseTable.freeContent, false)
            )
        )
        .orderBy(CourseTable.name);
}
