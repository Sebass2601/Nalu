# Nalu Escuela Holística

A paid e-learning platform for holistic and spiritual courses, built for Spanish-speaking students. It is in production at [naluescuela.com](https://naluescuela.com).

I am the lead developer of the application.

## Features

- **Courses and lessons:** course catalogue, lesson video player, free classes and announcements
- **Accounts:** sign-in with Google or email and password, with password reset by email
- **Payments:** purchases through Hotmart, provisioned automatically by webhook
- **Admin panel:** course editor with drag-and-drop ordering
- **Media pipeline:** lesson videos encoded by script and served from Cloudflare R2 with presigned URLs
- **Compliance and SEO:** cookie notice for European visitors, consent-aware analytics, sitemap and Open Graph images

## Tech stack

| Area | Technologies |
| --- | --- |
| Framework | Next.js 16 (App Router), React 19, TypeScript |
| UI | Tailwind CSS 4, shadcn/ui, Radix UI, Framer Motion |
| Data | PostgreSQL 17, Drizzle ORM with versioned migrations |
| Auth | Auth.js (Google OAuth and credentials) |
| Payments | Hotmart API and webhooks |
| Storage and email | Cloudflare R2, UploadThing, Resend |
| Security | Arcjet, environment variables validated with Zod |
| Testing | Vitest |
| Infrastructure | Hetzner server, Docker Compose, Caddy (automatic HTTPS), GitHub Actions, GitHub Container Registry |

## Architecture and deployment

```
push to main
   │
   ▼
GitHub Actions ── run database migrations ── build Docker image ── push to GHCR
   │
   ▼
Hetzner server (Docker Compose)
   ├── Caddy        HTTPS and certificates
   ├── Next.js app
   └── PostgreSQL 17
```

Every push to `main` deploys automatically, with no manual steps. Secrets live only in GitHub Actions and on the server, never in the repository. Operational details are in [`deploy/README.md`](deploy/README.md).

## Project structure

```
src/
  app/          routes: (auth), (consumer), admin, api, features
  components/   shared UI components
  drizzle/      database schema and migrations
  lib/          business logic and integrations
  test/         Vitest tests
deploy/         Dockerfile, production Compose file and Caddy configuration
scripts/        maintenance scripts (for example, lesson video encoding)
docs/           implementation plans
```

## Running locally

```bash
pnpm install
docker compose up -d     # local PostgreSQL 17 database
pnpm db:migrate          # apply database migrations
pnpm dev                 # http://localhost:3000
pnpm test                # run the test suite
```

The application expects its environment variables in a local `.env` file and validates them on startup.

## Development workflow

Developed with AI-assisted tooling (Claude Code). Every AI-generated change is reviewed before it ships.
