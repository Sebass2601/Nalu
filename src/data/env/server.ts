import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod"; 

export const env = createEnv ({
    server: {
        DB_PASSWORD: z.string().min(1),
        DB_USER: z.string().min(1),
        DB_NAME: z.string().min(1),
        DB_HOST: z.string().min(1),

        // Which way in to the production Postgres. It publishes two ports,
        // and which one applies depends on where the caller is standing:
        //
        //   5432  the ordinary Postgres port. Published on loopback only, so
        //         it is reachable from the server itself or through an SSH
        //         tunnel — which is how the deploy workflow runs migrations.
        //         Also what the app uses in-network, where compose overrides
        //         DB_HOST/DB_PORT to reach the `db` service directly.
        //   6543  the public, TLS-only port for people connecting from
        //         outside (a psql session, a GUI client). pg_hba refuses an
        //         unencrypted connection here, so DB_SSL and DB_CA_CERT_PATH
        //         below are required with it.
        //
        // Defaults to 5432 because that is also plain Postgres's port, which
        // keeps the local Docker setup free of extra configuration.
        DB_PORT: z.coerce.number().int().positive().default(5432),

        // Whether to encrypt the database connection. Local Postgres runs in
        // Docker on loopback, and in production the app reaches the database
        // over the private compose network — neither crosses a hostile link,
        // so TLS buys nothing and would only add setup. It matters on the
        // public 6543 port above, where the password and every row would
        // otherwise travel in the clear. Defaults to off so both zero-config
        // paths stay zero-config; a client on 6543 opts in.
        DB_SSL: z
            .enum(["true", "false"])
            .default("false")
            .transform(value => value === "true"),

        // Path to the certificate authority that signed the database's TLS
        // certificate. Production Postgres is signed by our own root CA
        // (certs/nalu-prod-ca.crt) rather than a public one, so the system
        // trust store rejects it and verification needs this file explicitly.
        // Optional only because DB_SSL=false has nothing to verify;
        // sslConfig() rejects the half-configured case of SSL on with no CA,
        // which would otherwise silently skip validation.
        DB_CA_CERT_PATH: z.string().optional(),

        AUTH_SECRET: z.string().min(1),
        AUTH_GOOGLE_ID: z.string().min(1),
        AUTH_GOOGLE_SECRET: z.string().min(1),
        UPLOADTHING_TOKEN: z.string().min(1),

        // --- Hotmart -----------------------------------------------------
        // Hotmart is the merchant of record: legally the seller, so it collects
        // and remits VAT and sales tax worldwide and pays the balance out.
        // There is no official Node SDK, so these feed a hand-written client.
        //
        // Sandbox and production are separate credential pairs. The sandbox is
        // a stub server — it returns fictional canned data for REST endpoints
        // only, has no checkout, and delivers no webhooks — so this switches
        // which host the client talks to and nothing more. Defaults to
        // production so a missing value fails safe rather than silently
        // pointing live traffic at fabricated data.
        HOTMART_SERVER: z.enum(["sandbox", "production"]).default("production"),
        HOTMART_CLIENT_ID: z.string().min(1),
        HOTMART_CLIENT_SECRET: z.string().min(1),

        // Stored WITHOUT the "Basic " prefix — the client adds it. Pasting the
        // prefixed form yields "Authorization: Basic Basic ..." and a 401 that
        // looks exactly like wrong credentials, which is a miserable hour.
        HOTMART_BASIC_TOKEN: z.string().min(1),

        // The webhook's shared secret, sent as X-HOTMART-HOTTOK on every
        // delivery.
        //
        // Materially weaker than Stripe's or Polar's signatures: it is the same
        // string every time, carries no timestamp, and is not bound to the
        // request body, so anyone who learns it can forge any event. Three
        // things compensate — a timing-safe comparison, deduplication on the
        // event id, and re-verifying high-value events against the API before
        // granting anything.
        HOTMART_HOTTOK: z.string().min(1),

        // Subscriptions are built and unit-tested but not sold yet: no Hotmart
        // subscription product exists, and submitting one for review with
        // nothing behind it invites a rejection against the account.
        //
        // See the refinement below `server`, which is what makes the eight
        // ALL_ACCESS variables legally absent while this is false.
        SUBSCRIPTIONS_ENABLED: z
            .enum(["true", "false"])
            .default("false")
            .transform(value => value === "true"),

        // The two all-access plans. Optional here and required by the
        // refinement, never unconditionally: the app must boot without them.
        //
        // Three codes each, because Hotmart uses different identifiers for
        // different jobs — the 7-digit product ID matches incoming webhooks,
        // the hotlink builds the checkout URL, the offer code picks the price.
        //
        // The PRICE values are display copy only, in whole dollars. Hotmart
        // exposes no endpoint returning an offer's price, so unlike the Stripe
        // arrangement they replace there is no way to read the real number
        // back. Repricing is therefore a two-step manual procedure; see the
        // spec's "Known drift" section.
        HOTMART_ALL_ACCESS_MONTHLY_PRODUCT_ID: z.string().min(1).optional(),
        HOTMART_ALL_ACCESS_MONTHLY_CHECKOUT_CODE: z.string().min(1).optional(),
        HOTMART_ALL_ACCESS_MONTHLY_OFFER_CODE: z.string().min(1).optional(),
        HOTMART_ALL_ACCESS_MONTHLY_PRICE: z.coerce
            .number()
            .int()
            .positive()
            .optional(),
        HOTMART_ALL_ACCESS_YEARLY_PRODUCT_ID: z.string().min(1).optional(),
        HOTMART_ALL_ACCESS_YEARLY_CHECKOUT_CODE: z.string().min(1).optional(),
        HOTMART_ALL_ACCESS_YEARLY_OFFER_CODE: z.string().min(1).optional(),
        HOTMART_ALL_ACCESS_YEARLY_PRICE: z.coerce
            .number()
            .int()
            .positive()
            .optional(),

        // --- Cloudflare R2 ------------------------------------------------
        // Lesson videos live in a private bucket and are only ever reachable
        // through short-lived presigned URLs. The account id is not a secret —
        // it is part of every endpoint URL — but the secret access key can
        // write to the bucket, so it lives in .env and Vercel and nowhere else.
        //
        // The account id and access key id are both 32 hex characters and the
        // secret is 64. The checks are here for the same reason the Stripe ones
        // are: pasting the S3 endpoint URL where the account id belongs is the
        // easy mistake, and without this the app boots fine and fails later
        // with an opaque signing error instead of naming the variable.
        R2_ACCOUNT_ID: z.string().regex(/^[0-9a-f]{32}$/, {
            message: "Debe ser el ID de cuenta (32 hex), no la URL del endpoint",
        }),
        R2_ACCESS_KEY_ID: z.string().min(1),
        R2_SECRET_ACCESS_KEY: z.string().min(1),
        R2_BUCKET_NAME: z.string().min(1),
    },
    experimental__runtimeEnv: process.env,
});

// Enabling subscriptions and configuring them must happen together.
//
// Marking the eight ALL_ACCESS variables merely optional above would have been
// simpler and worse on its own: it permits a half-configured state that boots
// happily and then fails at a customer's checkout — the exact failure this
// whole schema exists to prevent. This check turns "subscriptions are off" into
// a declared state, and makes turning them on without finishing the
// configuration impossible.
//
// It sits at module scope rather than inside the schema because this version of
// @t3-oss/env-nextjs (0.13.11) exposes no hook for a cross-field refinement.
// The effect is the same: this module is imported during boot, so a
// misconfiguration fails the build or the server start, never a purchase.
//
// Every missing variable is named at once, so switching this on is one boot
// cycle rather than eight.
if (env.SUBSCRIPTIONS_ENABLED) {
    const required = [
        "HOTMART_ALL_ACCESS_MONTHLY_PRODUCT_ID",
        "HOTMART_ALL_ACCESS_MONTHLY_CHECKOUT_CODE",
        "HOTMART_ALL_ACCESS_MONTHLY_OFFER_CODE",
        "HOTMART_ALL_ACCESS_MONTHLY_PRICE",
        "HOTMART_ALL_ACCESS_YEARLY_PRODUCT_ID",
        "HOTMART_ALL_ACCESS_YEARLY_CHECKOUT_CODE",
        "HOTMART_ALL_ACCESS_YEARLY_OFFER_CODE",
        "HOTMART_ALL_ACCESS_YEARLY_PRICE",
    ] as const;

    const missing = required.filter(key => env[key] == null);

    if (missing.length > 0) {
        throw new Error(
            `SUBSCRIPTIONS_ENABLED=true requires: ${missing.join(", ")}. ` +
                "Create the two Hotmart subscription products, collect their " +
                "codes, and set these before enabling."
        );
    }
}
