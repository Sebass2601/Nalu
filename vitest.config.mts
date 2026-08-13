import { defineConfig } from "vitest/config";

// `.mts` rather than `.ts`: the project's package.json has no `"type": "module"`,
// so a `.ts` config is loaded as CommonJS and Vite warns about the ESM syntax in
// it. The extension settles it without changing how the Next.js app is built.
export default defineConfig({
    resolve: {
        // Resolves the `@/*` alias from tsconfig.json. Vite does this natively
        // now — the `vite-tsconfig-paths` plugin that used to be needed for it
        // is redundant and Vitest warns when it sees one.
        tsconfigPaths: true,
        alias: {
            // `import "server-only"` is a build-time guardrail: Next.js resolves
            // it and fails the build if a server module is ever pulled into a
            // client bundle, which is what stops secrets reaching the browser.
            //
            // Nothing outside Next resolves it — the package is not a
            // dependency, because installing the real one would make every test
            // touching a server module throw on import. Aliasing it to an empty
            // stub here keeps the guardrail exactly where it does its work (the
            // build) while letting those same modules be unit-tested.
            "server-only": new URL(
                "./src/test/serverOnlyStub.ts",
                import.meta.url
            ).pathname,
        },
    },
    test: {
        environment: "node",
        setupFiles: ["./src/test/setup.ts"],
        include: ["src/**/*.test.ts"],
    },
});
