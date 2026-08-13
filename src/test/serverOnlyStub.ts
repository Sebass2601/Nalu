// Stands in for the `server-only` package when Vitest resolves it.
//
// `import "server-only"` exists so the Next.js build fails loudly if a module
// holding secrets is ever imported from a client component. That check belongs
// to the bundler and has nothing to say inside a Node test process, where there
// is no client bundle to leak into.
//
// The real package is deliberately not installed: its entry point throws on
// import outside a React Server Component, so every test touching a server
// module would fail for a reason unrelated to what it was testing.
//
// Empty on purpose. See the alias in vitest.config.mts.
export {};
