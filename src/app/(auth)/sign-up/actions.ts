"use server";

import { hash } from "bcryptjs";
import { sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/drizzle/db";
import { UserTable } from "@/drizzle/schema";
import { signIn } from "@/auth";
import { safeReturnPath } from "@/lib/returnPath";
import { signUpSchema } from "@/data/schemas/auth";

// The shape of what this action hands back to the form. Either a general
// `error` (e.g. duplicate email) or per-field messages (e.g. password too short).
export type SignUpState = {
    error?: string;
    fieldErrors?: {
        name?: string[];
        email?: string[];
        password?: string[];
    };
};

// Signature required by useActionState: (previousState, formData) => newState.
export async function signUp(
    _prevState: SignUpState | undefined,
    formData: FormData,
): Promise<SignUpState> {
    // Pull the raw values out of the submitted form and validate them.
    const parsed = signUpSchema.safeParse({
        name: formData.get("name"),
        email: formData.get("email"),
        password: formData.get("password"),
    });

    if (!parsed.success) {
        // Turn zod's error into simple { fieldName: [messages] } for the form.
        return { fieldErrors: z.flattenError(parsed.error).fieldErrors };
    }

    const { name, email, password } = parsed.data;

    const existing = await db.query.UserTable.findFirst({
        where: sql`lower(${UserTable.email}) = ${email}`,
    });
    if (existing) {
        return { error: "Ya hay una cuenta con este email." };
    }

    const hashedPassword = await hash(password, 12);

    await db.insert(UserTable).values({ name, email, password: hashedPassword });

    // On success this redirects (it throws internally), so nothing below runs.
    // Same validated hand-off as the login form: the value came from a query
    // parameter, so it is checked immediately before it becomes a redirect.
    await signIn("credentials", {
        email,
        password,
        redirectTo: safeReturnPath(formData.get("next")?.toString()),
    });

    // Only here to satisfy the return type; unreachable on success.
    return {};
}
