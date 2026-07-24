import { z } from "zod";

export function normalizeEmail(email: string) {
    return email.trim().toLowerCase();
}

export const emailSchema = z
    .string()
    .transform(normalizeEmail)
    .pipe(z.email("Introduce un email válido."));

export const signUpSchema = z.object({
    name: z.string().min(1, "Se necesita un nombre."),
    email: emailSchema,
    password: z.string()
    .min(8, "Mínimo 8 carácteres para la contraseña.")
    .max(72, "Máximo 72 carácteres para la contraseña.")
});

export type SignUpInput = z.infer<typeof signUpSchema>;
