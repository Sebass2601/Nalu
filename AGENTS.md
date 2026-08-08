<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.

# Deployment

Every push to `main` deploys to BOTH Vercel (its Git integration, Supabase
DB) and a self-hosted Hetzner server (naluescuela.com, own Postgres) via
`.github/workflows/deploy-hetzner.yml`. Hetzner migrations and seed run
automatically on deploy; Supabase migrations are manual
(`pnpm db:migrate:remote`). Server access is SSH-key-only — no passwords
exist. Read `deploy/README.md` before touching anything deployment-related.
<!-- END:nextjs-agent-rules -->
