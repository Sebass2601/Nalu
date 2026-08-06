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
    },
    test: {
        environment: "node",
        setupFiles: ["./src/test/setup.ts"],
        include: ["src/**/*.test.ts"],
    },
});
