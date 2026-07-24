import { createRouteHandler } from "uploadthing/next";
import { fileRouter } from "./core";

// Exposes GET/POST at /api/uploadthing so the client upload components have
// a server endpoint to talk to.
export const { GET, POST } = createRouteHandler({
    router: fileRouter,
});
