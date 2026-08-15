# Public CA certificates (safe to commit — no private keys here).
#
# nalu-prod-ca.crt  — our own root CA for the Hetzner production Postgres
#                     (naluescuela.com:6543). Generated on the server; the
#                     private key stays in /opt/nalu/pgtls/ca.key (root-only).
#                     See "Direct database access" in deploy/README.md.
#
# Only clients connecting from outside the server need this. The app itself
# reaches Postgres over the compose network and does not read anything here —
# the production image does not even contain this directory.
