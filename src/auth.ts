import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { db } from "@/drizzle/db";
import {
    UserTable,
    AccountTable,
    SessionTable,
    VerificationTokenTable,
} from "@/drizzle/schema";

export const { handlers, signIn, signOut, auth } = NextAuth({
    adapter: DrizzleAdapter(db, {
        usersTable: UserTable,
        accountsTable: AccountTable,
        sessionsTable: SessionTable,
        verificationTokensTable: VerificationTokenTable,
    }),
    providers: [Google],
});
