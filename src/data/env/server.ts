import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod"; 

export const env = createEnv ({
    server: {
        DB_PASSWORD: z.string().min(1),
        DB_USER: z.string().min(1),
        DB_NAME: z.string().min(1),
        DB_HOST: z.string().min(1),

        // Which Supabase pooler to talk to. The port is the only thing that
        // distinguishes them, and the right choice depends on the caller:
        //
        //   5432  session mode — one server connection held for the whole
        //         session. Supports prepared statements, SET, and advisory
        //         locks, so migrations need it. Used locally and by the
        //         :remote scripts.
        //   6543  transaction mode — a server connection is borrowed per
        //         transaction and handed back. No session state survives
        //         between statements, but thousands of clients can share a
        //         few connections. Serverless needs it, so this is what
        //         Vercel is configured with.
        //
        // Defaults to 5432 because that is also plain Postgres's port, which
        // keeps the local Docker setup free of extra configuration.
        DB_PORT: z.coerce.number().int().positive().default(5432),

        // Whether to encrypt the database connection. Local Postgres runs in
        // Docker on loopback, where TLS buys nothing and would only add setup;
        // Supabase is reached across the public internet, where the password
        // and every row would otherwise travel in the clear. Defaults to off
        // so the local path stays zero-config — remote env files opt in.
        DB_SSL: z
            .enum(["true", "false"])
            .default("false")
            .transform(value => value === "true"),

        // Path to the certificate authority that signed the database's TLS
        // certificate. Supabase signs with its own private CA rather than a
        // public one, so the system trust store rejects it and verification
        // needs this file explicitly. Optional only because DB_SSL=false has
        // nothing to verify; sslConfig() rejects the half-configured case of
        // SSL on with no CA, which would otherwise silently skip validation.
        DB_CA_CERT_PATH: z.string().optional(),

        AUTH_SECRET: z.string().min(1),
        AUTH_GOOGLE_ID: z.string().min(1),
        AUTH_GOOGLE_SECRET: z.string().min(1),
        UPLOADTHING_TOKEN: z.string().min(1),

        // --- Stripe ------------------------------------------------------
        // The prefix checks are deliberate. Every Stripe credential looks like
        // a random string, so the classic mistake is pasting the publishable
        // key (`pk_...`) where the secret key belongs, or a price ID where a
        // product ID belongs. Without these the app boots fine and only fails
        // later, at checkout, with an opaque Stripe error. With them it refuses
        // to start and names the offending variable.
        STRIPE_SECRET_KEY: z.string().startsWith("sk_"),
        STRIPE_WEBHOOK_SECRET: z.string().startsWith("whsec_"),

        // The two recurring prices of the all-access plan. These live in env
        // rather than the database because they are fixed infrastructure, and
        // because the sandbox and live accounts have different IDs for what is
        // conceptually the same plan — swapping .env swaps the whole account.
        STRIPE_ALL_ACCESS_MONTHLY_PRICE_ID: z.string().startsWith("price_"),
        STRIPE_ALL_ACCESS_YEARLY_PRICE_ID: z.string().startsWith("price_"),

        // Absolute origin used to build Checkout's success_url / cancel_url.
        // Stripe redirects the browser to these after payment, so they cannot
        // be relative paths. Kept server-side (no NEXT_PUBLIC_) because only
        // server code ever builds a Checkout Session.
        SERVER_URL: z.url(),
    },
    experimental__runtimeEnv: process.env
});