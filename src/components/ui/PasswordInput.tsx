"use client";

import { useState } from "react";
import { EyeIcon, EyeOffIcon } from "lucide-react";

import { cn } from "@/lib/utils";

// The password box, with an eye to uncover what is in it.
//
// It exists because a password typed blind on a phone is guessed at rather than
// read, and the usual consequence is a login that fails for a typo the person
// cannot see. Every password field on the site goes through here, so uncovering
// works the same way on the login screen as it does on /profile.
//
// The state is a plain `useState` and nothing outside this component can read
// it: the reveal lives for as long as the field is on screen and is gone on the
// next page load. Nothing is written to storage, and the value itself is never
// touched — only the `type` attribute changes, so the browser still treats the
// box as a password field for autofill and for its own password manager.
//
// `type="button"` is load-bearing. A `<button>` inside a `<form>` submits it by
// default, so without this, uncovering the password would try to log you in
// with whatever is typed so far.
export function PasswordInput({
    className,
    ...props
}: Omit<React.ComponentProps<"input">, "type">) {
    const [revealed, setRevealed] = useState(false);

    const label = revealed ? "Ocultar contraseña" : "Mostrar contraseña";

    return (
        // `relative` so the button can be pinned to the field's right edge, and
        // the wrapper is a block rather than a flex row: the input keeps the
        // full width the forms lay out for it, and the button sits over it.
        <div className="relative">
            <input
                {...props}
                type={revealed ? "text" : "password"}
                // `pr-10` reserves the corner the button occupies, so a long
                // password scrolls under the label rather than behind the eye.
                className={cn(className, "w-full pr-10")}
            />

            <button
                type="button"
                onClick={() => setRevealed(shown => !shown)}
                // The eye is a convenience, not a step in the form. Leaving it
                // out of the tab order keeps Tab running down the fields to the
                // submit button the way it does on every other form here.
                tabIndex={-1}
                aria-label={label}
                aria-pressed={revealed}
                title={label}
                className="absolute inset-y-0 right-0 flex cursor-pointer items-center px-3 text-gold/60 transition-colors hover:text-gold focus-visible:text-gold focus-visible:outline-none"
            >
                {revealed ? (
                    <EyeOffIcon className="size-4" aria-hidden />
                ) : (
                    <EyeIcon className="size-4" aria-hidden />
                )}
            </button>
        </div>
    );
}
