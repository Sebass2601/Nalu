"use client";

import { useActionState } from "react";
import { signUp } from "./actions";

export default function SignUpForm() {
    // useActionState wires this component to the server action. It returns:
    //  - state:   whatever the action last returned (errors, etc.)
    //  - action:  a wrapped version to hand to <form action={...}>
    //  - pending: true while the action is running (for disabling the button)
    // The second argument (undefined) is the initial state before first submit.
    const [state, action, pending] = useActionState(signUp, undefined);

    return (
        <form action={action} className="flex flex-col gap-4 w-full">
            <h1 className="text-2xl tracking-widest text-yellow-200 text-center">
                Crear cuenta
            </h1>

            {/* General error (e.g. duplicate email) */}
            {state?.error && (
                <p className="text-sm text-red-400 text-center">{state.error}</p>
            )}

            <div className="flex flex-col gap-1">
                <label htmlFor="name" className="text-xs tracking-widest text-yellow-200/90">
                    Nombre
                </label>
                <input
                    id="name"
                    name="name"
                    type="text"
                    className="rounded-md border border-yellow-200/40 bg-white/5 px-3 py-2 text-yellow-50 placeholder-yellow-200/30 outline-none focus:border-yellow-200 focus:ring-1 focus:ring-yellow-200/50"
                />
                {state?.fieldErrors?.name && (
                    <p className="text-sm text-red-400">
                        {state.fieldErrors.name[0]}
                    </p>
                )}
            </div>

            <div className="flex flex-col gap-1">
                <label htmlFor="email" className="text-xs tracking-widest text-yellow-200/90">
                    Email
                </label>
                <input
                    id="email"
                    name="email"
                    type="text"
                    className="rounded-md border border-yellow-200/40 bg-white/5 px-3 py-2 text-yellow-50 placeholder-yellow-200/30 outline-none focus:border-yellow-200 focus:ring-1 focus:ring-yellow-200/50"
                />
                {state?.fieldErrors?.email && (
                    <p className="text-sm text-red-400">
                        {state.fieldErrors.email[0]}
                    </p>
                )}
            </div>

            <div className="flex flex-col gap-1">
                <label htmlFor="password" className="text-xs tracking-widest text-yellow-200/90">
                    Contraseña
                </label>
                <input
                    id="password"
                    name="password"
                    type="password"
                    className="rounded-md border border-yellow-200/40 bg-white/5 px-3 py-2 text-yellow-50 placeholder-yellow-200/30 outline-none focus:border-yellow-200 focus:ring-1 focus:ring-yellow-200/50"
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
                className="mt-2 rounded-md bg-yellow-200 px-4 py-2 font-semibold tracking-widest text-[#0a1628] hover:bg-yellow-100 disabled:opacity-50 cursor-pointer"
            >
                {pending ? "Creando..." : "Crear cuenta"}
            </button>
        </form>
    );
}
