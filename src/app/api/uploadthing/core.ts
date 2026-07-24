import { createUploadthing, type FileRouter } from "uploadthing/next";
import { UploadThingError } from "uploadthing/server";
import { getCurrentUser } from "@/app/features/users/actions/currentUser";
import { canUpdateLessons } from "@/app/features/lessons/permissions/lessons";
import { canUpdateProducts } from "@/app/features/products/permissions/products";

const f = createUploadthing();

// The file routes this app exposes. Each key is an "endpoint" the client
// uploads to. Here we only allow image uploads for lessons, admins only.
export const fileRouter = {
    lessonImage: f({
        image: { maxFileSize: "4MB", maxFileCount: 3 },
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
} satisfies FileRouter;

export type AppFileRouter = typeof fileRouter;
