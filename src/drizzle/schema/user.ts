import {
  pgEnum,
  pgTable,
  timestamp,
  text,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { createdAt, id, updatedAt } from "../schemaHelpers";
import { relations, sql } from "drizzle-orm";
import { UserCourseAccessTable } from "./userCourseAccess";
import { AccountTable, SessionTable } from "./authTables";

export const userRoles = ["user", "admin"] as const;
export type UserRole = (typeof userRoles)[number];
export const userRoleEnum = pgEnum("user_role", userRoles);

export const UserTable = pgTable("users", {
  id,
  email: text().notNull(),
  name: text().notNull().default("user"),
  role: userRoleEnum().notNull().default("user"),
  password: text(),
  image: text(),
  emailVerified: timestamp({ withTimezone: true }),
  deletedAt: timestamp({ withTimezone: true }),
  createdAt,
  updatedAt,
}, table => [
  uniqueIndex("users_email_lower_unique").on(
    sql`lower(${table.email})`
  ),
]);

export const UserRelationships = relations(
    UserTable,
    ({ many }) => ({
        userCourseAccesses: many(UserCourseAccessTable),
        accounts: many(AccountTable),
        sessions: many(SessionTable),
    })
);
