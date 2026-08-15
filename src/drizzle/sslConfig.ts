import fs from "node:fs";
import path from "node:path";
import { env } from "@/data/env/server";

/**
 * Builds the `ssl` option shared by the app's connection pool and by
 * drizzle-kit.
 *
 * Both need identical settings — a migration that can reach the database
 * while the app cannot (or vice versa) is a confusing failure — so the
 * decision lives here rather than being spelled out twice.
 *
 * The return value is deliberately either `false` or a fully verified
 * configuration, with nothing in between. The tempting middle ground,
 * `rejectUnauthorized: false`, encrypts the connection but skips checking
 * who is on the other end, so it stops passive eavesdropping while leaving
 * an active man-in-the-middle free to present any certificate at all. Since
 * that connection carries the database password, the weak option is worse
 * than useless: it looks secure in code review and is not.
 */
export function sslConfig(): false | { ca: string; rejectUnauthorized: true } {
    if (!env.DB_SSL) return false;

    if (!env.DB_CA_CERT_PATH) {
        throw new Error(
            "DB_SSL is enabled but DB_CA_CERT_PATH is not set. The production " +
                "Postgres is signed by our own private CA, so verification " +
                "needs that root certificate: point this at " +
                "certs/nalu-prod-ca.crt (see \"Direct database access\" in " +
                "deploy/README.md).",
        );
    }

    // Relative paths resolve against the working directory so that the same
    // value works whether it is read by `next dev` or by drizzle-kit, both of
    // which run from the project root.
    const certPath = path.resolve(process.cwd(), env.DB_CA_CERT_PATH);

    if (!fs.existsSync(certPath)) {
        throw new Error(
            `DB_CA_CERT_PATH points at ${certPath}, which does not exist. ` +
                "The certificate is committed at certs/nalu-prod-ca.crt — " +
                "point this at that file, or clear DB_SSL if this connection " +
                "does not cross the public internet.",
        );
    }

    return { ca: fs.readFileSync(certPath, "utf8"), rejectUnauthorized: true };
}
