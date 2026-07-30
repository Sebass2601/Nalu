import { env } from "@/data/env/server";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "./schema";
import { sslConfig } from "./sslConfig";

export const db = drizzle({
    schema,
    connection: {
        password: env.DB_PASSWORD,
        user: env.DB_USER,
        database: env.DB_NAME,
        host: env.DB_HOST,
        port: env.DB_PORT,
        ssl: sslConfig(),

        // Serverless multiplies pools: every warm function instance keeps its
        // own, so the cap that matters is per-instance times however many
        // instances Vercel decides to run. node-postgres defaults to 10,
        // which a traffic spike turns into hundreds of client connections and
        // a pooler that starts refusing them. Four is plenty per instance —
        // requests queue for a moment instead of failing outright, and the
        // transaction pooler is doing the real sharing on the far side.
        max: 4,
    },
});