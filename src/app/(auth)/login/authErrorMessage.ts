// What to tell someone Auth.js sent back to /login with `?error=<code>`.
//
// Auth.js only ever puts a short list of codes in that parameter (anything
// else it reports as "Configuration"), but the parameter is still just part of
// a URL anyone can type. So the code only ever SELECTS one of the fixed
// messages below — it is never shown itself — and an unknown one gets the
// generic message.
//
// Returns null when there is no error to explain.
export type AuthErrorNotice = {
    message: string;
    // Whether to offer the "forgot my password" link under the message.
    offerPasswordReset: boolean;
};

export function authErrorMessage(
    code: string | string[] | undefined
): AuthErrorNotice | null {
    // A repeated parameter arrives as an array. Nothing legitimate sends one.
    if (typeof code !== "string" || code === "") return null;

    switch (code) {
        // The case this exists for: somebody signed up with email and password,
        // and now tries "Continuar con Google" with the same address. Auth.js
        // refuses to merge the two on its own (see src/auth.ts), so the way in
        // is the password — or, if that is what was forgotten, a reset link.
        case "OAuthAccountNotLinked":
            return {
                message:
                    "Ya tienes una cuenta con este email, creada con contraseña. " +
                    "Inicia sesión con tu email y tu contraseña.",
                offerPasswordReset: true,
            };

        // The `signIn` callback in src/auth.ts said no — today that only
        // happens for an account that was deleted.
        case "AccessDenied":
            return {
                message: "No pudimos iniciar sesión con esa cuenta.",
                offerPasswordReset: false,
            };

        // Anything else: Google itself failed, the person cancelled on
        // Google's screen, a stale link, a misconfiguration.
        default:
            return {
                message:
                    "Algo salió mal al iniciar sesión con Google. Inténtalo de nuevo.",
                offerPasswordReset: false,
            };
    }
}
