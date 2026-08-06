import { expect, test } from "vitest";

// Asserts against SERVER_URL rather than any R2 variable: `createEnv` only
// exposes keys declared in its schema, so a variable is readable here only once
// the env module knows about it. The R2 ones arrive in the next task, and this
// test is about the harness — that it runs, and that `@/` resolves — not about
// what happens to be configured.
test("the test harness runs and resolves the @ alias", async () => {
    const { env } = await import("@/data/env/server");
    expect(env.SERVER_URL).toBe("http://localhost:3000");
});
