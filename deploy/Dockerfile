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

# Everything COPYed above lands owned by root, and the server runs as `node`.
# That matters for exactly one path: `.next/cache`, the only directory Next.js
# writes to at runtime — resized images under `images/`, and the prerender and
# fetch caches `cacheComponents` keeps beside it.
#
# Left unwritable, none of it fails loudly. Next.js catches the error, logs
# "Failed to write image to cache", and serves the image anyway, so the site
# looks healthy while every request for every image re-downloads the original
# from UploadThing and re-encodes it to WebP — measured at 1.2-2.0s of
# time-to-first-byte, on every image, for every visitor, forever. Creating the
# directory as `node` is the whole fix.
RUN mkdir -p .next/cache/images && chown -R node:node .next/cache

USER node
EXPOSE 3000
CMD ["node", "server.js"]
