import "server-only";

import { UTApi } from "uploadthing/server";

const utapi = new UTApi();

function getUploadThingFileKey(url: string) {
    try {
        const parsedUrl = new URL(url);
        const isUploadThingHost =
            parsedUrl.hostname === "ufs.sh" ||
            parsedUrl.hostname.endsWith(".ufs.sh");

        if (parsedUrl.protocol !== "https:" || !isUploadThingHost) {
            return null;
        }

        const pathParts = parsedUrl.pathname.split("/").filter(Boolean);

        // Subdomain format: https://APP_ID.ufs.sh/f/KEY
        if (pathParts[0] === "f" && pathParts.length === 2) {
            return pathParts[1];
        }

        // Path format: https://ufs.sh/a/APP_ID/KEY
        if (pathParts[0] === "a" && pathParts.length === 3) {
            return pathParts[2];
        }

        return null;
    } catch {
        return null;
    }
}

// `readonly` because the list is only ever read here, which lets callers pass
// an `as const` array straight through without copying it.
export async function deleteUploadThingFiles(urls: string | readonly string[]) {
    const fileUrls = typeof urls === "string" ? [urls] : urls;
    const keys = [
        ...new Set(
            fileUrls
                .map(getUploadThingFileKey)
                .filter((key): key is string => key != null)
        ),
    ];

    if (keys.length === 0) return;

    try {
        const result = await utapi.deleteFiles(keys);

        if (!result.success || result.deletedCount !== keys.length) {
            console.error(
                `[uploadthing] Deleted ${result.deletedCount} of ${keys.length} files.`
            );
        }
    } catch (error) {
        const message =
            error instanceof Error ? error.message : "Unknown error";

        // Database mutations have already succeeded, so storage cleanup is
        // best-effort and must not turn a valid deletion into an application error.
        console.error(
            `[uploadthing] Failed to delete ${keys.length} files: ${message}`
        );
    }
}
