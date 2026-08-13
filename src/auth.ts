import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { compare } from "bcryptjs";
import { and, eq, isNull, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/drizzle/db";
import { emailSchema, normalizeEmail } from "@/data/schemas/auth";
import {
    UserTable,
    AccountTable,
    SessionTable,
    VerificationTokenTable,
    UserRole,
} from "@/drizzle/schema";

// Shape and rules for the login form input. `safeParse` in `authorize` rejects
// anything malformed before we ever touch the database.
const signInSchema = z.object({
    email: emailSchema,
    password: z.string().min(1),
});

export const { handlers, signIn, signOut, auth } = NextAuth({
    adapter: DrizzleAdapter(db, {
        usersTable: UserTable,
        accountsTable: AccountTable,
        sessionsTable: SessionTable,
        verificationTokensTable: VerificationTokenTable,
    }),
    // Derive the public URL from the headers Caddy sets, rather than from the
    // address the server happens to be bound to.
    //
    // Without this, Auth.js has no idea what host it is publicly reachable at:
    // the container binds 0.0.0.0, so it builds the OAuth `redirect_uri` as
    // `https://0.0.0.0/...`, Google redirects the browser there, and the user
    // gets ERR_SSL_PROTOCOL_ERROR from an address that is not a real host.
    // Sign-in is the only thing that breaks, so the site looks perfectly
    // healthy right up until somebody tries to log in.
    //
    // IN CODE, DELIBERATELY, rather than as AUTH_TRUST_HOST in the environment.
    // This has now been lost once: it lived in the deploy's app.env, was
    // documented nowhere, and vanished the moment that secret was regenerated
    // from the credential list in deploy/README.md. A fact this load-bearing
    // belongs where it cannot be dropped by editing an env file.
    //
    // Safe because the app container publishes no ports — see
    // deploy/compose.prod.yml, where only Caddy binds 80 and 443. Every request
    // reaching this process has passed through Caddy, so the Host and
    // X-Forwarded-* headers are Caddy's and cannot be spoofed from outside.
    trustHost: true,
    session: { strategy: "jwt" },
    callbacks: {
        async signIn({ user }) {
            if (user.email == null) return false;

            const email = normalizeEmail(user.email);
            // Auth.js uses this object when creating a new OAuth user.
            user.email = email;

            const existingUser = await db.query.UserTable.findFirst({
                columns: { deletedAt: true },
                where: sql`lower(${UserTable.email}) = ${email}`,
            });

            // New OAuth users do not exist yet and may continue. Existing
            // users may sign in only while their account is active.
            return existingUser == null || existingUser.deletedAt == null;
        },

        async jwt({ token, user }) {
            if (user) {
                token.id = user.id;
                const dbUser = await db.query.UserTable.findFirst({
                    where: eq(UserTable.id, user.id as string),
                });
                token.role = dbUser?.role;
            }
            return token;
        },

        session({ session, token }) {
            if (token.id) session.user.id = token.id as string;
            if (token.role) session.user.role = token.role as UserRole;
            return session;
        },
    },
    providers: [
        Google,
        Credentials({
            // The login half of local auth. Returns the user on success, or
            // null on any failure (which surfaces as a generic sign-in error).
            authorize: async credentials => {
                // 1. Validate the raw input before hitting the database.
                const parsed = signInSchema.safeParse(credentials);
                if (!parsed.success) return null;
                const { email, password } = parsed.data;

                // 2. Find the user by email.
                const user = await db.query.UserTable.findFirst({
                    where: and(
                        sql`lower(${UserTable.email}) = ${email}`,
                        isNull(UserTable.deletedAt)
                    ),
                });

                // 3. Reject if there's no user, or the user has no password
                //    (e.g. a Google-only account that never set one).
                if (!user?.password) return null;

                // 4. Compare the typed password against the stored hash.
                const passwordMatches = await compare(password, user.password);
                if (!passwordMatches) return null;

                // 5. Return the user. `id` is required so the jwt callback can
                //    stamp it onto the token.
                return {
                    id: user.id,
                    email: user.email,
                    name: user.name,
                    image: user.image,
                };
            },
        }),
    ],
});
