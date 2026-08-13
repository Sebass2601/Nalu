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
    HOTMART_SERVER: "sandbox",
    HOTMART_CLIENT_ID: "test-client-id",
    HOTMART_CLIENT_SECRET: "test-client-secret",
    // Base64-shaped, because the real one is and a test fixture that looks
    // nothing like production hides format bugs rather than catching them.
    HOTMART_BASIC_TOKEN: "dGVzdC1iYXNpYy10b2tlbg==",
    HOTMART_HOTTOK: "test-hottok",
    // Off, matching launch. The eight ALL_ACCESS variables are deliberately
    // absent: that combination is the one the app actually ships with, so it is
    // the one the tests should exercise.
    SUBSCRIPTIONS_ENABLED: "false",
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
