import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod"; 

export const env = createEnv ({
    server: {
        DB_PASSWORD: z.string().min(1),
        DB_USER: z.string().min(1),
        DB_NAME: z.string().min(1),
        DB_HOST: z.string().min(1),
        AUTH_SECRET: z.string().min(1),
        AUTH_GOOGLE_ID: z.string().min(1),
        AUTH_GOOGLE_SECRET: z.string().min(1),
        UPLOADTHING_TOKEN: z.string().min(1),
    },
    experimental__runtimeEnv: process.env
});