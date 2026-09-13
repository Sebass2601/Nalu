"use client";

import { useActionState } from "react";

import { PasswordInput } from "@/components/ui/PasswordInput";
import { useForgetOnLeave } from "@/components/ui/useForgetOnLeave";
import { signUp } from "./actions";

export default function SignUpForm({ next }: { next: string }) {
    // useActionState wires this component to the server action. It returns:
    //  - state:   whatever the action last returned (errors, etc.)
    //  - action:  a wrapped version to hand to <form action={...}>
    //  - pending: true while the action is running (for disabling the button)
    // The second argument (undefined) is the initial state before first submit.
    const [state, action, pending] = useActionState(signUp, undefined);
    // Half-finished answers do not wait here for whoever opens the page next.
    const nameRef = useForgetOnLeave();
    const emailRef = useForgetOnLeave();

    return (
        <form action={action} className="flex flex-col gap-4 w-full">
            {/* Where to land after signing in, carried from the page's
                `next` query parameter. Validated again in the action before it
                becomes a redirect — a hidden field is still a field, and the
                browser will send whatever it is edited to say. */}
            <input type="hidden" name="next" value={next} />
            <h1 className="text-2xl tracking-widest text-ink-bright text-center">
                Crear cuenta
            </h1>

            {/* General error (e.g. duplicate email) */}
            {state?.error && (
                <p className="text-sm text-red-400 text-center">{state.error}</p>
            )}

            <div className="flex flex-col gap-1">
                <label htmlFor="name" className="text-xs tracking-widest text-ink-body">
                    Nombre
                </label>
                <input
                    id="name"
                    name="name"
                    ref={nameRef}
                    type="text"
                    className="font-sans rounded-md border border-gold/40 bg-white/5 px-3 py-2 text-ink-bright placeholder-white/30 outline-none focus:border-gold focus:ring-1 focus:ring-gold/50"
                />
                {state?.fieldErrors?.name && (
                    <p className="text-sm text-red-400">
                        {state.fieldErrors.name[0]}
                    </p>
                )}
            </div>

            <div className="flex flex-col gap-1">
                <label htmlFor="email" className="text-xs tracking-widest text-ink-body">
                    Email
                </label>
                <input
                    id="email"
                    name="email"
                    ref={emailRef}
                    type="text"
                    className="font-sans rounded-md border border-gold/40 bg-white/5 px-3 py-2 text-ink-bright placeholder-white/30 outline-none focus:border-gold focus:ring-1 focus:ring-gold/50"
                />
                {state?.fieldErrors?.email && (
                    <p className="text-sm text-red-400">
                        {state.fieldErrors.email[0]}
                    </p>
                )}
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
                {state?.fieldErrors?.password && (
                    <ul className="text-sm text-red-400">
                        {state.fieldErrors.password.map(msg => (
                            <li key={msg}>{msg}</li>
                        ))}
                    </ul>
                )}
            </div>

            <button
                type="submit"
                disabled={pending}
                className="mt-2 rounded-md bg-gold px-4 py-2 font-bold tracking-widest text-[#0a1628] hover:bg-gold-bright disabled:opacity-50 cursor-pointer"
            >
                {pending ? "Creando..." : "Crear cuenta"}
            </button>
        </form>
    );
}
