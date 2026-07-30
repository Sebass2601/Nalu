import { createUploadthing, type FileRouter } from "uploadthing/next";
import { UploadThingError } from "uploadthing/server";
import { getCurrentUser } from "@/app/features/users/actions/currentUser";
import { canUpdateLessons } from "@/app/features/lessons/permissions/lessons";
import { canUpdateProducts } from "@/app/features/products/permissions/products";
import { canUpdateCourses } from "@/app/features/courses/permissions/courses";
import { MAX_LESSON_IMAGES_PER_UPLOAD } from "@/app/features/lessons/lessonImages.constants";

const f = createUploadthing();

// The file routes this app exposes. Each key is an "endpoint" the client
// uploads to. Here we only allow image uploads for lessons, admins only.
export const fileRouter = {
    // A lesson holds as many images as its author wants. `maxFileCount` still
    // has to be a number — UploadThing offers no "unlimited" — but it caps a
    // single upload rather than the lesson, so a longer gallery is just more
    // than one drag.
    lessonImage: f({
        image: {
            maxFileSize: "4MB",
            maxFileCount: MAX_LESSON_IMAGES_PER_UPLOAD,
        },
    })
        // Runs on our server before the upload is allowed. If it throws, the
        // upload is rejected. This is what stops non-admins from uploading.
        .middleware(async () => {
            const user = await getCurrentUser();

            if (!canUpdateLessons({ role: user.role })) {
                throw new UploadThingError("No autorizado");
            }

            return { userId: user.userId };
        })
        // Runs on our server after the file lands in UploadThing storage.
        // Whatever we return here is sent back to the browser.
        .onUploadComplete(async ({ file }) => {
            return { url: file.ufsUrl };
        }),

    // A single image for a product. The returned URL is stored in the
    // product's `imageUrl` column by the product form.
    productImage: f({
        image: { maxFileSize: "4MB", maxFileCount: 1 }
    })
        .middleware(async () => {
            const user = await getCurrentUser();

            if (!canUpdateProducts({ role: user.role })) {
                throw new UploadThingError("No autorizado");
            }

            return { userId: user.userId };
        })
        .onUploadComplete(async ({ file }) => {
            return { url: file.ufsUrl };
        }),
    // A single cover image for a course. Its own endpoint rather than a shared
    // one with products, so the permission check matches what is being edited.
    courseImage: f({
        image: { maxFileSize: "4MB", maxFileCount: 1 }
    })
        .middleware(async () => {
            const user = await getCurrentUser();

            if (!canUpdateCourses({ role: user.role })) {
                throw new UploadThingError("No autorizado");
            }

            return { userId: user.userId };
        })
        .onUploadComplete(async ({ file }) => {
            return { url: file.ufsUrl };
        }),
} satisfies FileRouter;

export type AppFileRouter = typeof fileRouter;
