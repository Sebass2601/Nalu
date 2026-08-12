import { index, pgTable, primaryKey, uuid } from "drizzle-orm/pg-core";
import { UserTable } from "./user";
import { CourseTable } from "./course";
import { createdAt, updatedAt } from "../schemaHelpers";
import { relations } from "drizzle-orm";



export const UserCourseAccessTable = pgTable(
    "user_course_access",
    {
        userId: uuid()
            .notNull()
            .references(() => UserTable.id, {onDelete: "cascade" }),
        courseId: uuid()
            .notNull()
            .references(() => CourseTable.id, {onDelete: "cascade" }),
        // Which admin handed this access out, or NULL when it came from a
        // purchase. This is the ONLY thing separating the two, and the admin
        // access screen leans on it hard: a NULL row is someone who paid, and
        // paid access can never be revoked from that screen — only a refund
        // takes it away.
        //
        // Rows that predate this column are all NULL, which reads as
        // "purchased" and therefore protected. That is the safe direction to
        // fail: the worst case is an admin having to refund instead of click.
        //
        // `set null` rather than `cascade`: deleting the admin who granted
        // access must not delete a student's access. The grant outlives whoever
        // made it, and merely forgets who that was.
        grantedBy: uuid().references(() => UserTable.id, {
            onDelete: "set null",
        }),
        createdAt,
        updatedAt,
    },
    t => [
        primaryKey({ columns: [t.userId, t.courseId ]}),
        // The primary key indexes (userId, courseId) in that order, which
        // answers "what does this user own" but not "who owns this course" —
        // the leftmost-prefix rule means a courseId-only filter cannot use it.
        // That second question is exactly what the admin access list asks, and
        // what the student counts on /admin/courses join on, so both were
        // sequential scans until this index.
        index("user_course_access_courseId_idx").on(t.courseId),
        // Foreign keys are not indexed automatically, so without this the
        // `set null` above has to scan the whole table to find the rows
        // belonging to a deleted admin.
        index("user_course_access_grantedBy_idx").on(t.grantedBy),
    ],
);

export const UserCourseAcessRelationships = relations(
    UserCourseAccessTable,
    ({ one }) => ({
      user: one(UserTable, {
        fields: [UserCourseAccessTable.userId],
        references: [UserTable.id],
      }),
      course: one(CourseTable, {
        fields: [UserCourseAccessTable.courseId],
        references: [CourseTable.id],
      }),
      // `grantedBy` deliberately gets no relation. A second link to UserTable
      // would make `user` above ambiguous and force relationNames through both
      // sides of the schema, and nothing reads the granting admin as an object
      // — only whether the column is NULL. The id is still there to audit
      // against directly if that question ever comes up.
    })
);
