"use server";

import { cookies } from "next/headers";
import { z } from "zod";
import { signIn } from "@/auth";
import { resetPasswordSchema } from "@/data/schemas/profile";
import { redeemPasswordReset } from "@/app/features/users/db/passwordReset";
import {
    RESET_COOKIE,
    RESET_PAGE_PATH,
} from "@/app/features/users/lib/passwordReset";

export type ResetPasswordState = {
    error?: string;
    // Set when the link itself is the problem, so the form can offer a new one
    // instead of asking for the password again.
    linkInvalid?: boolean;
    fieldErrors?: {
        newPassword?: string[];
        confirmPassword?: string[];
    };
};

const INVALID_LINK =
    "Este enlace ya no es válido: caducó o ya se usó. Pide uno nuevo.";

// Sets the new password and signs the person straight in with it.
//
// The key comes from the cookie the email's link set, never from the form —
// see ./enlace/route.ts for why it is kept out of the page.
export async function resetPassword(
    _prevState: ResetPasswordState | undefined,
    formData: FormData
): Promise<ResetPasswordState> {
    const cookieStore = await cookies();
    const token = cookieStore.get(RESET_COOKIE)?.value;
    if (token == null) {
        return { error: INVALID_LINK, linkInvalid: true };
    }

    const parsed = resetPasswordSchema.safeParse({
        newPassword: formData.get("newPassword"),
        confirmPassword: formData.get("confirmPassword"),
    });
    if (!parsed.success) {
        return { fieldErrors: z.flattenError(parsed.error).fieldErrors };
    }

    const email = await redeemPasswordReset(token, parsed.data.newPassword);

    // Spent or not, the cookie has done its job. A key that failed will fail
    // again, and one that worked must not be offered a second time.
    cookieStore.delete({ name: RESET_COOKIE, path: RESET_PAGE_PATH });

    if (email == null) {
        return { error: INVALID_LINK, linkInvalid: true };
    }

    // Straight in, rather than "now go and log in": they have just proved who
    // they are twice over (the inbox, then the new password). Throws a redirect
    // on success, which Next turns into the navigation.
    //
    // Sessions on other devices are not ended: they are signed JWTs holding no
    // password, so changing it does not invalidate them. They lapse on their
    // own expiry — the same trade-off the profile's password form makes.
    await signIn("credentials", {
        email,
        password: parsed.data.newPassword,
        redirectTo: "/",
    });

    return {};
}
