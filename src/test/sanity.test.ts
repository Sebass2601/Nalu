import { expect, test } from "vitest";

// Asserts against a variable the app actually reads: `createEnv` only exposes
// keys declared in its schema, so a value is readable here only once the env
// module knows about it. This test is about the harness — that it runs, and
// that `@/` resolves — not about what happens to be configured.
//
// It used to assert on SERVER_URL, which has since been removed: it existed to
// build the payment provider's return URLs, and Hotmart's are configured in its
// own dashboard rather than sent by us.
test("the test harness runs and resolves the @ alias", async () => {
    const { env } = await import("@/data/env/server");
    expect(env.HOTMART_SERVER).toBe("sandbox");
});
