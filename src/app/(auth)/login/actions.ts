"use server";

import { AuthError } from "next-auth";
import { signIn } from "@/auth";
import { safeReturnPath } from "@/lib/returnPath";

export type LoginState = { error?: string };

export async function login(
    _prevState: LoginState | undefined,
    formData: FormData,
): Promise<LoginState> {
    try {
        await signIn("credentials", {
            email: formData.get("email"),
            password: formData.get("password"),
            // Carried in a hidden field, having arrived as a query parameter, so
            // it is checked here rather than trusted. `safeReturnPath` answers
            // "/" for anything it does not positively recognise, which is what
            // the redirect used to be unconditionally.
            redirectTo: safeReturnPath(formData.get("next")?.toString()),
        });
        return {};
    } catch (error) {
        // A wrong password throws an AuthError -> show a friendly message.
        if (error instanceof AuthError) {
            return { error: "Email o contraseña incorrectos." };
        }
        // IMPORTANT: a *successful* login also "throws" — a redirect signal.
        // We must re-throw it, or the redirect would be silently swallowed.
        throw error;
    }
}
