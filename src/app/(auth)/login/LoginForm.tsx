"use client";

import { useActionState } from "react";

import { PasswordInput } from "@/components/ui/PasswordInput";
import { login } from "./actions";

export default function LoginForm({ next }: { next: string }) {
    const [state, action, pending] = useActionState(login, undefined);

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

            <div className="flex flex-col gap-1">
                <label htmlFor="email" className="text-xs tracking-widest text-ink-body">
                    Email
                </label>
                <input
                    id="email"
                    name="email"
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
