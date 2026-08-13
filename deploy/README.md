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
| `pgtls/` | Postgres TLS certs + `pg_hba.conf` for direct DB access | server admin |

Caddy obtains and renews the Let's Encrypt certificates on its own.

## Supplying the third-party credentials

The app needs credentials for Google OAuth, Hotmart, UploadThing, Arcjet and
Cloudflare R2. Whoever owns them never needs SSH access: they live in a
single GitHub Actions secret, and every deploy rewrites `/opt/nalu/app.env`
from it.

1. Compose a plain env file with the real values (no quotes):

   ```env
   AUTH_GOOGLE_ID=...
   AUTH_GOOGLE_SECRET=...
   UPLOADTHING_TOKEN=...
   ARCJET_KEY=ajkey_...
   HOTMART_SERVER=production
   HOTMART_CLIENT_ID=...
   HOTMART_CLIENT_SECRET=...
   HOTMART_BASIC_TOKEN=...
   HOTMART_HOTTOK=...
   SUBSCRIPTIONS_ENABLED=false
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

  Nothing about the public URL belongs in this secret. Auth.js sets
  `trustHost: true` in `src/auth.ts` and derives the host from the headers
  Caddy sets. That used to depend on an environment variable, which was
  documented nowhere and disappeared the first time this secret was
  regenerated from the list above — producing an OAuth redirect to
  `https://0.0.0.0/...` and an ERR_SSL_PROTOCOL_ERROR that only appears when
  somebody tries to log in.
- **Hotmart**: register the webhook under *Tools → Webhook* pointing at
  `https://naluescuela.com/api/webhooks/hotmart`, version `2.0.0`, subscribed
  to every event under *Compras* and *Suscripciones* and nothing else. Copy the
  **hottok** from the Authentication tab into `HOTMART_HOTTOK` above.

  Note the hottok is one per ACCOUNT, not one per endpoint — unlike a Stripe
  signing secret there is no second value for a second environment, so anything
  else pointed at that account shares it.

  A missing or wrong `HOTMART_HOTTOK` does not break the deploy: the build only
  needs format-valid placeholders, so the site comes up looking healthy while
  every real Hotmart delivery is rejected 403 and no purchase is ever
  provisioned. Verify after deploying, do not assume.

## Other workflow secrets

Set once, already configured:

| Secret | Value |
|---|---|
| `NALU_SSH_HOST` | server IP |
| `NALU_SSH_KEY` | private key of the `deploy` user |
| `NALU_DB_PASSWORD` | production Postgres password (matches `/opt/nalu/.env`) |

## How server access works

There are no passwords anywhere in this setup — do not go looking for one:

- The server was provisioned through the Hetzner API with a cloud-init
  script that created a `deploy` user, installed an SSH public key, and
  **disabled password authentication**. Login is possible only with the
  matching private key.
- **Current key holders** (registered in `/home/deploy/.ssh/authorized_keys`
  as the key pair named `nalu-deploy`, created 2026-08-08):
  1. Angel's dev machine — `~/.ssh/nalu_deploy_key`. This is the machine
     that provisioned the server and can SSH and tunnel directly.
  2. The `NALU_SSH_KEY` GitHub Actions secret — same private key, used by
     the deploy workflow.

  To grant another person access, append their own public key to
  `authorized_keys` on the server (don't share the existing private key).
- Production Postgres is reachable two ways. The deploy workflow (and
  anyone with SSH) tunnels to the loopback publish:

  ```bash
  ssh -i <key> -f -N -L 15432:127.0.0.1:5432 deploy@<server-ip>
  psql -h 127.0.0.1 -p 15432 -U nalu nalu   # password: DB_PASSWORD in /opt/nalu/.env
  ```

  Contributors without SSH access use the direct TLS port below.

## Direct database access (Supabase-style)

Postgres is also published on **`naluescuela.com:6543`**, protected the
same way Supabase protects theirs: TLS is mandatory (`pg_hba.conf` rejects
unencrypted remote connections outright), auth is scram-sha-256, and every
person gets their own role — never the app's `nalu` user.

Connect with the CA certificate from this repo
([`certs/nalu-prod-ca.crt`](../certs/nalu-prod-ca.crt)):

```bash
psql "host=naluescuela.com port=6543 dbname=nalu user=<role> sslmode=verify-full sslrootcert=certs/nalu-prod-ca.crt"
```

GUI clients (TablePlus, DBeaver, pgAdmin) take the same five values; set
SSL mode to *verify-full* and point the root/CA certificate at that file.

To grant someone access, create them a role (through the SSH tunnel or any
existing superuser connection):

```sql
CREATE ROLE <name> LOGIN PASSWORD '<long random password>';
GRANT nalu TO <name>;  -- full access to the app schema, revocable per-person
```

To revoke: `DROP ROLE <name>;`. Schema changes must still go through
drizzle migrations in the repo — the deploy runs them on every push, and
hand-applied DDL will drift and conflict.

The TLS material lives in `/opt/nalu/pgtls/` on the server: `server.crt` /
`server.key` (what Postgres serves), `ca.crt` (the repo copy's source),
`ca.key` (root-only; needed only to reissue certs — both expire 2036) and
`pg_hba.conf` (the TLS-enforcement rules, mounted into the container by
`compose.prod.yml`).

- If the private key is ever compromised: generate a new pair, replace
  `/home/deploy/.ssh/authorized_keys` on the server, update `NALU_SSH_KEY`.

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
