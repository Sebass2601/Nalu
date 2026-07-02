import { pgEnum, pgTable, timestamp, text } from "drizzle-orm/pg-core";
import { createdAt, id, updatedAt } from "../schemaHelpers";
import { relations } from "drizzle-orm";
import { UserCourseAccessTable } from "./userCourseAccess";
import { AccountTable, SessionTable } from "./authTables";

export const userRoles = ["user", "admin"] as const;
export type UserRole = (typeof userRoles)[number];
export const userRoleEnum = pgEnum("user_role", userRoles);

export const UserTable = pgTable("users", {
  id,
  email: text().notNull().unique(),
  name: text().notNull().default("user"),
  image: text(),
  emailVerified: timestamp({ withTimezone: true }),
  deletedAt: timestamp({ withTimezone: true }),
  createdAt,
  updatedAt,
});

export const UserRelationships = relations(
    UserTable,
    ({ many }) => ({
        userCourseAccesses: many(UserCourseAccessTable),
        accounts: many(AccountTable),
        sessions: many(SessionTable),
    })
);