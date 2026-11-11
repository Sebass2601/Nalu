"use client";

import { useActionState } from "react";
import Link from "next/link";

import { PasswordInput } from "@/components/ui/PasswordInput";
import { resetPassword } from "./actions";

const INPUT_CLASS =
    "font-sans rounded-md border border-gold/40 bg-white/5 px-3 py-2 text-ink-bright placeholder-white/30 outline-none focus:border-gold focus:ring-1 focus:ring-gold/50";

export default function ResetPasswordForm() {
    const [state, action, pending] = useActionState(resetPassword, undefined);

    // The key turned out to be spent between drawing the page and submitting
    // (used in another tab, or it expired meanwhile). Same answer the page
    // gives for a dead link.
    if (state?.linkInvalid) {
        return <InvalidResetLink message={state.error} />;
    }

    return (
        <form action={action} className="flex flex-col gap-4 w-full">
            <h1 className="text-2xl tracking-widest text-ink-bright text-center">
                Nueva contraseña
            </h1>

            {state?.error && (
                <p className="text-sm text-red-400 text-center">{state.error}</p>
            )}

            <div className="flex flex-col gap-1">
                <label htmlFor="newPassword" className="text-xs tracking-widest text-ink-body">
                    Nueva contraseña
                </label>
                <PasswordInput
                    id="newPassword"
                    name="newPassword"
                    autoComplete="new-password"
                    className={INPUT_CLASS}
                />
                {state?.fieldErrors?.newPassword && (
                    <ul className="text-sm text-red-400">
                        {state.fieldErrors.newPassword.map(msg => (
                            <li key={msg}>{msg}</li>
                        ))}
                    </ul>
                )}
            </div>

            <div className="flex flex-col gap-1">
                <label htmlFor="confirmPassword" className="text-xs tracking-widest text-ink-body">
                    Repite la contraseña
                </label>
                <PasswordInput
                    id="confirmPassword"
                    name="confirmPassword"
                    autoComplete="new-password"
                    className={INPUT_CLASS}
                />
                {state?.fieldErrors?.confirmPassword && (
                    <p className="text-sm text-red-400">
                        {state.fieldErrors.confirmPassword[0]}
                    </p>
                )}
            </div>

            <button
                type="submit"
                disabled={pending}
                className="mt-2 rounded-md bg-gold px-4 py-2 font-bold tracking-widest text-[#0a1628] hover:bg-gold-bright disabled:opacity-50 cursor-pointer"
            >
                {pending ? "Guardando..." : "Guardar y entrar"}
            </button>
        </form>
    );
}

export function InvalidResetLink({ message }: { message?: string }) {
    return (
        <div className="flex flex-col gap-4 text-center">
            <h1 className="text-2xl tracking-widest text-ink-bright">
                Enlace no válido
            </h1>
            <p className="font-sans text-sm leading-relaxed text-ink-body">
                {message ??
                    "Este enlace ya no es válido: caducó o ya se usó. Pide uno nuevo."}
            </p>
            <Link
                href="/recuperar-contrasena"
                className="rounded-md bg-gold px-4 py-2 font-bold tracking-widest text-[#0a1628] hover:bg-gold-bright"
            >
                Pedir otro enlace
            </Link>
        </div>
    );
}
