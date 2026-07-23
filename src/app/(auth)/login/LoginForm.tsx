"use client";

import { useActionState } from "react";
import { login } from "./actions";

export default function LoginForm() {
    const [state, action, pending] = useActionState(login, undefined);

    return (
        <form action={action} className="flex flex-col gap-4 w-full">
            <h1 className="text-2xl tracking-widest text-yellow-200 text-center">
                Iniciar sesión
            </h1>

            {state?.error && (
                <p className="text-sm text-red-400 text-center">{state.error}</p>
            )}

            <div className="flex flex-col gap-1">
                <label htmlFor="email" className="text-xs tracking-widest text-yellow-200/90">
                    Email
                </label>
                <input
                    id="email"
                    name="email"
                    type="text"
                    className=" font-sans rounded-md border border-yellow-200/40 bg-white/5 px-3 py-2 text-yellow-50 placeholder-yellow-200/30 outline-none focus:border-yellow-200 focus:ring-1 focus:ring-yellow-200/50"
                />
            </div>

            <div className="flex flex-col gap-1">
                <label htmlFor="password" className="text-xs tracking-widest text-yellow-200/90">
                    Contraseña
                </label>
                <input
                    id="password"
                    name="password"
                    type="password"
                    className="font-sans rounded-md border border-yellow-200/40 bg-white/5 px-3 py-2 text-yellow-50 placeholder-yellow-200/30 outline-none focus:border-yellow-200 focus:ring-1 focus:ring-yellow-200/50"
                />
            </div>

            <button
                type="submit"
                disabled={pending}
                className="mt-2 rounded-md bg-yellow-200 px-4 py-2 font-semibold tracking-widest text-[#0a1628] hover:bg-yellow-100 disabled:opacity-50 cursor-pointer"
            >
                {pending ? "Entrando..." : "Iniciar sesión"}
            </button>
        </form>
    );
}
