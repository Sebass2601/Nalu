import { generateReactHelpers } from "@uploadthing/react";
import type { AppFileRouter } from "@/app/api/uploadthing/core";

// Typed upload hook bound to our file router. We build our own uploader UI on
// top of this (styled with the app's own Tailwind/shadcn classes) instead of
// UploadThing's prebuilt components, which require importing a global
// stylesheet that ships a conflicting CSS reset.
export const { useUploadThing } = generateReactHelpers<AppFileRouter>();
