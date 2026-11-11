"use server";

import { after } from "next/server";
import { env } from "@/data/env/server";
import { emailSchema } from "@/data/schemas/auth";
import { sendEmail } from "@/lib/email";
import {
    issuePasswordReset,
    withdrawPasswordReset,
} from "@/app/features/users/db/passwordReset";
import {
    passwordResetEmail,
    resetLink,
} from "@/app/features/users/lib/passwordReset";

export type ForgotPasswordState = { sent?: boolean; error?: string };

// "I forgot my password": sends a one-time link to the address, if it belongs
// to an account.
//
// The answer is the same whether or not it does. "No account with that email"
// would turn this form into a free way to learn who studies at Nalu, one
// address at a time.
//
// The same goes for how LONG the answer takes. Looking the account up and
// sending the email both happen in `after`, once the reply has already left —
// otherwise a reply that came back quickly would itself say "nobody here",
// since only a real account costs a round trip to Resend.
export async function requestPasswordReset(
    _prevState: ForgotPasswordState | undefined,
    formData: FormData
): Promise<ForgotPasswordState> {
    const parsed = emailSchema.safeParse(formData.get("email"));
    if (!parsed.success) {
        return { error: "Introduce un email válido." };
    }
    const email = parsed.data;

    after(async () => {
        try {
            await sendResetEmail(email);
        } catch (error) {
            // Nobody is waiting on this any more, so the server log is the
            // only place a failure can be reported. The visitor was already
            // told to check their inbox; the cooldown was released (below), so
            // asking again is a real retry.
            console.error("[password-reset] could not send:", error);
        }
    });

    return { sent: true };
}

async function sendResetEmail(email: string) {
    // Checked before a key is issued, so a misconfigured server does not leave
    // keys behind that no email will ever carry.
    if (env.AUTH_URL == null) {
        throw new Error(
            "AUTH_URL is not set, so the reset link has no address to point at."
        );
    }

    const issued = await issuePasswordReset(email);
    if (issued == null) return;

    const { subject, html, text } = passwordResetEmail({
        name: issued.name,
        link: resetLink(env.AUTH_URL, issued.token),
    });

    try {
        await sendEmail({ to: issued.email, subject, html, text });
    } catch (error) {
        await withdrawPasswordReset(issued.token);
        throw error;
    }
}
