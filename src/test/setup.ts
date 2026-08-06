// The env module validates on import, so any test that reaches it — directly or
// through a module that does — needs every required variable present. These are
// syntactically valid dummies, never real credentials: the point is to satisfy
// the schema, and a test that needs a real value should inject it explicitly.
//
// Assigned with `??=` so a variable already set in the environment wins. That
// keeps the door open for a test run against real credentials without editing
// this file.
const testEnv: Record<string, string> = {
    DB_PASSWORD: "test",
    DB_USER: "test",
    DB_NAME: "test",
    DB_HOST: "localhost",
    AUTH_SECRET: "test-secret",
    AUTH_GOOGLE_ID: "test-google-id",
    AUTH_GOOGLE_SECRET: "test-google-secret",
    UPLOADTHING_TOKEN: "test-uploadthing-token",
    STRIPE_SECRET_KEY: "sk_test_dummy",
    STRIPE_WEBHOOK_SECRET: "whsec_dummy",
    STRIPE_ALL_ACCESS_MONTHLY_PRICE_ID: "price_dummy_monthly",
    STRIPE_ALL_ACCESS_YEARLY_PRICE_ID: "price_dummy_yearly",
    SERVER_URL: "http://localhost:3000",
    // Shaped like the real thing — 32 hex characters — because the env schema
    // rejects anything else, which is what stops the S3 endpoint URL being
    // pasted here by mistake.
    R2_ACCOUNT_ID: "0123456789abcdef0123456789abcdef",
    R2_ACCESS_KEY_ID: "test-access-key-id",
    R2_SECRET_ACCESS_KEY: "test-secret-access-key",
    R2_BUCKET_NAME: "test-bucket",
};

for (const [key, value] of Object.entries(testEnv)) {
    process.env[key] ??= value;
}
