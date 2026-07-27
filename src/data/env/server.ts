import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod"; 

export const env = createEnv ({
    server: {
        DB_PASSWORD: z.string().min(1),
        DB_USER: z.string().min(1),
        DB_NAME: z.string().min(1),
        DB_HOST: z.string().min(1),
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