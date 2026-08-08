# Deploying Nalu

Every push to `main` deploys twice, independently:

- **Vercel** — through its own Git integration, using the Vercel project's
  environment (Supabase database). Nothing in this folder affects it.
- **Hetzner** — `naluescuela.com`, a single server with its own Postgres,
  deployed by [`.github/workflows/deploy-hetzner.yml`](../.github/workflows/deploy-hetzner.yml).

## How the Hetzner deploy works

The workflow builds the app (against a throwaway Postgres, because
prerendering reads the database), packages the standalone output with
[`Dockerfile`](./Dockerfile), pushes the image to GHCR, runs drizzle
migrations against the production database through an SSH tunnel, and
restarts the stack.

On the server, `/opt/nalu` contains:

| File | Purpose | Managed by |
|---|---|---|
| `compose.yml` | copy of [`compose.prod.yml`](./compose.prod.yml): app + Postgres 17 + Caddy | repo |
| `Caddyfile` | copy of [`Caddyfile`](./Caddyfile): HTTPS + www redirect | repo |
| `.env` | infrastructure env: DB password, `AUTH_SECRET`, domain | server admin |
| `app.env` | third-party credentials | **the `NALU_APP_ENV` secret (see below)** |

Caddy obtains and renews the Let's Encrypt certificates on its own.

## Supplying the third-party credentials

The app needs credentials for Google OAuth, Stripe, UploadThing, Arcjet and
Cloudflare R2. Whoever owns them never needs SSH access: they live in a
single GitHub Actions secret, and every deploy rewrites `/opt/nalu/app.env`
from it.

1. Compose a plain env file with the real values (no quotes):

   ```env
   AUTH_GOOGLE_ID=...
   AUTH_GOOGLE_SECRET=...
   UPLOADTHING_TOKEN=...
   ARCJET_KEY=ajkey_...
   STRIPE_SECRET_KEY=sk_live_...
   STRIPE_WEBHOOK_SECRET=whsec_...
   STRIPE_ALL_ACCESS_MONTHLY_PRICE_ID=price_...
   STRIPE_ALL_ACCESS_YEARLY_PRICE_ID=price_...
   R2_ACCOUNT_ID=...
   R2_ACCESS_KEY_ID=...
   R2_SECRET_ACCESS_KEY=...
   R2_BUCKET_NAME=...
   ```

2. Save it as the repository secret **`NALU_APP_ENV`**: on GitHub,
   *Settings → Secrets and variables → Actions → New repository secret*,
   name `NALU_APP_ENV`, paste the whole file as the value. Or with the CLI:

   ```bash
   gh secret set NALU_APP_ENV -R Sebass2601/Nalu < mi-archivo.env
   ```

3. Trigger a deploy: push to `main`, or run the **Deploy to Hetzner**
   workflow manually from the Actions tab (*Run workflow*).

To rotate a credential, edit the secret and deploy again. Values here
override the placeholders in the server's `.env`. GitHub secrets are
write-only — nobody can read the value back out of GitHub afterwards.

These values are never exposed to browsers: Next.js only embeds
`NEXT_PUBLIC_`-prefixed variables in client code, and this project has none.

### One-time chores that go with the credentials

- **Google OAuth**: add `https://naluescuela.com` to the authorized origins
  and `https://naluescuela.com/api/auth/callback/google` to the authorized
  redirect URIs of the OAuth client in Google Cloud Console.
- **Stripe**: create a second webhook endpoint pointing at
  `https://naluescuela.com/api/webhooks/stripe`, and use *that* endpoint's
  `whsec_...` as `STRIPE_WEBHOOK_SECRET` above (each endpoint has its own
  signing secret; the Vercel one keeps its own).

## Other workflow secrets

Set once, already configured:

| Secret | Value |
|---|---|
| `NALU_SSH_HOST` | server IP |
| `NALU_SSH_KEY` | private key of the `deploy` user |
| `NALU_DB_PASSWORD` | production Postgres password (matches `/opt/nalu/.env`) |

## Operating the server

```bash
ssh deploy@<server-ip>
cd /opt/nalu
docker compose ps                 # status
docker compose logs -f app       # app logs
docker compose up -d             # apply .env/app.env edits made by hand
```

The database persists in the `pgdata` Docker volume across deploys and
restarts. Deploys replace only the app container.
