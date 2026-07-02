import {
    pgTable,
    text,
    integer,
    timestamp,
    primaryKey,
    uuid,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import type { AdapterAccountType } from "next-auth/adapters";
import { UserTable } from "./user";

export const AccountTable = pgTable(
    "accounts",
    {
        userId: uuid()
            .notNull()
            .references(() => UserTable.id, { onDelete: "cascade" }),
        type: text().$type<AdapterAccountType>().notNull(),
        provider: text().notNull(),
        providerAccountId: text().notNull(),
        refresh_token: text(),
        access_token: text(),
        expires_at: integer(),
        token_type: text(),
        scope: text(),
        id_token: text(),
        session_state: text(),
    },
    t => [primaryKey({ columns: [t.provider, t.providerAccountId] })],
);

export const SessionTable = pgTable("sessions", {
    sessionToken: text().primaryKey(),
    userId: uuid()
        .notNull()
        .references(() => UserTable.id, { onDelete: "cascade" }),
    expires: timestamp({ withTimezone: true }).notNull(),
});

export const VerificationTokenTable = pgTable(
    "verification_tokens",
    {
        identifier: text().notNull(),
        token: text().notNull(),
        expires: timestamp({ withTimezone: true }).notNull(),
    },
    t => [primaryKey({ columns: [t.identifier, t.token] })],
);

export const AccountRelationships = relations(AccountTable, ({ one }) => ({
    user: one(UserTable, {
        fields: [AccountTable.userId],
        references: [UserTable.id],
    }),
}));

export const SessionRelationships = relations(SessionTable, ({ one }) => ({
    user: one(UserTable, {
        fields: [SessionTable.userId],
        references: [UserTable.id],
    }),
}));
