"use client";

import { useActionState } from "react";
import Link from "next/link";

import { PasswordInput } from "@/components/ui/PasswordInput";
import { useForgetOnLeave } from "@/components/ui/useForgetOnLeave";
import { login } from "./actions";
import type { AuthErrorNotice } from "./authErrorMessage";

export default function LoginForm({
    next,
    authError,
}: {
    next: string;
    // Why a Google sign-in bounced the person here, if it did.
    authError: AuthErrorNotice | null;
}) {
    const [state, action, pending] = useActionState(login, undefined);
    // Leaving the screen clears the box. The password field does this for
    // itself; the address has to ask, and an address half typed and thought
    // better of should not be waiting here on the way back either.
    const emailRef = useForgetOnLeave();

    return (
        <form action={action} className="flex flex-col gap-4 w-full">
            {/* Where to land after signing in, carried from the page's
                `next` query parameter. Validated again in the action before it
                becomes a redirect — a hidden field is still a field, and the
                browser will send whatever it is edited to say. */}
            <input type="hidden" name="next" value={next} />
            <h1 className="text-2xl tracking-widest text-ink-bright text-center">
                Iniciar sesión
            </h1>

            {state?.error && (
                <p className="text-sm text-red-400 text-center">{state.error}</p>
            )}

            {/* The Google bounce explains itself only until the form is used:
                after a submit, the form's own answer is the current news, and
                both at once would be two messages about two different tries. */}
            {state == null && authError != null && (
                <div
                    role="alert"
                    className="flex flex-col gap-1 rounded-md border border-red-400/40 bg-red-400/10 px-3 py-2 text-center font-sans text-sm text-ink-bright"
                >
                    <p>{authError.message}</p>
                    {authError.offerPasswordReset && (
                        <Link
                            href="/recuperar-contrasena"
                            className="text-ink-bright underline hover:text-white"
                        >
                            ¿No recuerdas tu contraseña? Recupérala aquí
                        </Link>
                    )}
                </div>
            )}

            <div className="flex flex-col gap-1">
                <label htmlFor="email" className="text-xs tracking-widest text-ink-body">
                    Email
                </label>
                <input
                    id="email"
                    name="email"
                    ref={emailRef}
                    type="text"
                    className=" font-sans rounded-md border border-gold/40 bg-white/5 px-3 py-2 text-ink-bright placeholder-white/30 outline-none focus:border-gold focus:ring-1 focus:ring-gold/50"
                />
            </div>

            <div className="flex flex-col gap-1">
                <label htmlFor="password" className="text-xs tracking-widest text-ink-body">
                    Contraseña
                </label>
                <PasswordInput
                    id="password"
                    name="password"
                    className="font-sans rounded-md border border-gold/40 bg-white/5 px-3 py-2 text-ink-bright placeholder-white/30 outline-none focus:border-gold focus:ring-1 focus:ring-gold/50"
                />
                {/* Right under the box it is about, where someone who has
                    just failed to remember a password is already looking. */}
                <Link
                    href="/recuperar-contrasena"
                    className="mt-1 self-end text-sm text-ink-body underline hover:text-white"
                >
                    ¿Olvidaste tu contraseña?
                </Link>
            </div>

            <button
                type="submit"
                disabled={pending}
                className="mt-2 rounded-md bg-gold px-4 py-2 font-bold tracking-widest text-[#0a1628] hover:bg-gold-bright disabled:opacity-50 cursor-pointer"
            >
                {pending ? "Entrando..." : "Iniciar sesión"}
            </button>
        </form>
    );
}
