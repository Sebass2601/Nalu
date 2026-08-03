import { z } from "zod";
import { emailSchema } from "./auth";

// The three edits /profile allows, each its own form and its own action, so a
// failed password change never discards a name the user just typed.

// Same rule sign-up applies, kept in one place so the two screens cannot drift
// into accepting different passwords.
const passwordSchema = z
    .string()
    .min(8, "Mínimo 8 carácteres para la contraseña.")
    .max(72, "Máximo 72 carácteres para la contraseña.");

export const updateProfileSchema = z.object({
    name: z.string().trim().min(1, "Se necesita un nombre."),
    // The URL UploadThing handed the browser, or null when the picture was
    // cleared. Empty string is what an untouched hidden input submits.
    image: z
        .string()
        .transform(value => (value === "" ? null : value))
        .nullable(),
});

export const updateEmailSchema = z
    .object({
        email: emailSchema,
        // Typed twice because nothing is sent to the new address to prove it
        // exists. A single mistyped character would move the account to an
        // address nobody reads and there would be no way back in through
        // credentials — this is the only check standing in for that mail.
        confirmEmail: emailSchema,
        // No length rule: this is checked against the stored hash, not created,
        // and rejecting it for being short would leak that it cannot be the
        // real one.
        currentPassword: z.string().min(1, "Introduce tu contraseña actual."),
    })
    // Compared after `emailSchema` has trimmed and lowercased both, so a
    // stray capital or trailing space is not treated as a mismatch — the two
    // addresses are the same address.
    .refine(data => data.email === data.confirmEmail, {
        message: "Los emails no coinciden.",
        path: ["confirmEmail"],
    });

export const updatePasswordSchema = z
    .object({
        currentPassword: z.string().min(1, "Introduce tu contraseña actual."),
        newPassword: passwordSchema,
        confirmPassword: z.string().min(1, "Repite la nueva contraseña."),
    })
    // Reported against `confirmPassword` so the message lands under the field
    // the user has to retype rather than at the top of the form.
    .refine(data => data.newPassword === data.confirmPassword, {
        message: "Las contraseñas no coinciden.",
        path: ["confirmPassword"],
    });
