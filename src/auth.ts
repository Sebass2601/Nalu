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
    // Trust the proxy in front of this app.
    //
    // NOTE: this is NOT what makes sign-in work — `AUTH_URL` is. Auth.js builds
    // every signinUrl and callbackUrl in `createActionURL`, which reads:
    //
    //     const envUrl = AUTH_URL ?? NEXTAUTH_URL
    //     if (envUrl) { url = new URL(envUrl) }          // wins outright
    //     else { host = x-forwarded-host ?? host ... }   // fallback
    //
    // The first branch never consults `trustHost` at all. On this deployment
    // the fallback resolves to `https://0.0.0.0:3000` — the container's own
    // listening socket — so Google is handed that as the redirect_uri, the
    // browser is sent there, and sign-in dies with ERR_SSL_PROTOCOL_ERROR.
    // Nothing else on the site breaks, which is why it can go unnoticed.
    //
    // So `AUTH_URL=https://naluescuela.com` must be present in the deploy's
    // app.env, and deploy/README.md lists it for exactly that reason: it was
    // dropped once when that secret was regenerated from a credential list
    // that did not record it, and the only symptom was that nobody could
    // log in.
    //
    // `trustHost` is kept because it is correct for an app that only ever
    // receives proxied requests, and it governs whether a header-supplied host
    // is accepted. It is safe here because the app container publishes no
    // ports — see deploy/compose.prod.yml, where only Caddy binds 80 and 443 —
    // so every Host header arriving has come through Caddy.
    trustHost: true,
    session: { strategy: "jwt" },
    // Where Auth.js sends people when sign-in fails, instead of its own
    // built-in pages — which are in English and look nothing like the site.
    //
    // Both point at our /login, which reads the `?error=` code Auth.js appends
    // and explains it in Spanish (see src/app/(auth)/login/authErrorMessage.ts).
    // Auth.js picks between the two by the kind of error: sign-in errors such
    // as OAuthAccountNotLinked — "Continuar con Google" on an account made with
    // a password — go to `signIn`; the rest, such as AccessDenied for a deleted
    // account, go to `error`.
    pages: {
        signIn: "/login",
        error: "/login",
    },
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
