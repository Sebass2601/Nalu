import "server-only";

import { Resend } from "resend";
import { env } from "@/data/env/server";

// Every email the site sends comes from this address. It is a real mailbox, so
// a reader who hits "reply" reaches a person rather than a void.
export const EMAIL_FROM = "Nalu <info@naluescuela.com>";

export type OutgoingEmail = {
    to: string;
    subject: string;
    // Both bodies, always. Mail clients that cannot or will not render HTML
    // show the text one, and spam filters look more kindly on a message that
    // carries both.
    html: string;
    text: string;
};

// Created on first use rather than at import, so a missing key does not stop
// the module loading — the env schema deliberately lets the app boot without
// one (see RESEND_API_KEY in src/data/env/server.ts).
let client: Resend | undefined;

// Sends one email through Resend, throwing if it was not accepted.
//
// The SDK itself never throws on an API failure: it resolves to `{ data, error }`
// and leaves checking `error` to the caller, which makes a rejected email very
// easy to mistake for a delivered one. Converting it into an exception here
// means the one place that forgets to check is not this one.
export async function sendEmail(email: OutgoingEmail) {
    if (env.RESEND_API_KEY == null) {
        throw new Error(
            "RESEND_API_KEY is not set, so no email can be sent. " +
                "Add it to the NALU_APP_ENV secret (see deploy/README.md)."
        );
    }

    client ??= new Resend(env.RESEND_API_KEY);

    const { data, error } = await client.emails.send({
        from: EMAIL_FROM,
        ...email,
    });

    if (error != null) {
        throw new Error(`Resend rejected the email: ${error.name}: ${error.message}`);
    }

    return data;
}
