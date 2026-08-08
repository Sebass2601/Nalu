# Packages a prebuilt Next.js standalone output into a runtime image.
#
# The build itself happens in CI (see .github/workflows/deploy-hetzner.yml),
# not here: `next build` with cacheComponents prerenders pages, which needs a
# reachable Postgres, and the workflow's service container provides one. This
# Dockerfile only assembles the already-built artifacts, so it stays a single
# cheap stage.
#
# Build context is the repo root:
#   docker build -f deploy/Dockerfile .
FROM node:22-slim

ENV NODE_ENV=production \
    HOSTNAME=0.0.0.0 \
    PORT=3000

WORKDIR /app

# server.js + traced node_modules
COPY .next/standalone ./
# Static assets: the standalone server serves these itself when present.
COPY .next/static ./.next/static
COPY public ./public

USER node
EXPOSE 3000
CMD ["node", "server.js"]
