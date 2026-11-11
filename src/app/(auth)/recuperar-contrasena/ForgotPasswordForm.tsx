"use client";

import { useActionState } from "react";
import Link from "next/link";

import { useForgetOnLeave } from "@/components/ui/useForgetOnLeave";
import { requestPasswordReset } from "./actions";

export default function ForgotPasswordForm() {
    const [state, action, pending] = useActionState(
        requestPasswordReset,
        undefined
    );
    const emailRef = useForgetOnLeave();

    // Once sent, the form gives way to the answer. Worded as "if" on purpose:
    // the action replies the same whether or not the address has an account,
    // and this sentence must not claim more than the action knows.
    if (state?.sent) {
        return (
            <div className="flex flex-col gap-4 text-center">
                <h1 className="text-2xl tracking-widest text-ink-bright">
                    Revisa tu email
                </h1>
                <p className="font-sans text-sm leading-relaxed text-ink-body">
                    Si hay una cuenta de Nalu con ese email, te enviamos un
                    enlace para elegir una nueva contraseña. Caduca en 60
                    minutos.
                </p>
                <p className="font-sans text-sm leading-relaxed text-ink-body">
                    ¿No llega? Mira en la carpeta de spam o espera un par de
                    minutos antes de pedir otro.
                </p>
                <Link
                    href="/login"
                    className="text-sm text-ink-bright underline hover:text-white"
                >
                    Volver a iniciar sesión
                </Link>
            </div>
        );
    }

    return (
        <form action={action} className="flex flex-col gap-4 w-full">
            <h1 className="text-2xl tracking-widest text-ink-bright text-center">
                Recuperar contraseña
            </h1>

            <p className="font-sans text-sm leading-relaxed text-ink-body text-center">
                Escribe el email de tu cuenta y te enviaremos un enlace para
                elegir una nueva contraseña.
            </p>

            {state?.error && (
                <p className="text-sm text-red-400 text-center">{state.error}</p>
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
                    autoComplete="email"
                    className="font-sans rounded-md border border-gold/40 bg-white/5 px-3 py-2 text-ink-bright placeholder-white/30 outline-none focus:border-gold focus:ring-1 focus:ring-gold/50"
                />
            </div>

            <button
                type="submit"
                disabled={pending}
                className="mt-2 rounded-md bg-gold px-4 py-2 font-bold tracking-widest text-[#0a1628] hover:bg-gold-bright disabled:opacity-50 cursor-pointer"
            >
                {pending ? "Enviando..." : "Enviar enlace"}
            </button>

            <Link
                href="/login"
                className="text-sm text-center text-ink-body underline hover:text-white"
            >
                Volver a iniciar sesión
            </Link>
        </form>
    );
}
