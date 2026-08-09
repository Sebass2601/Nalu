# Public CA certificates (safe to commit — no private keys here).
#
# prod-ca-2021.crt  — Supabase root CA (Vercel deployment's database).
#                     Download: Dashboard -> Settings -> Database -> SSL Configuration
# nalu-prod-ca.crt  — our own root CA for the Hetzner production Postgres
#                     (naluescuela.com:6543). Generated on the server; the
#                     private key stays in /opt/nalu/pgtls/ca.key (root-only).
#                     See "Direct database access" in deploy/README.md.
