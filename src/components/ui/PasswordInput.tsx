"use client";

import { useSyncExternalStore } from "react";
import { EyeIcon, EyeOffIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { useForgetOnLeave } from "./useForgetOnLeave";

// Where a field's eye remembers itself. `sessionStorage` rather than
// `localStorage` on purpose: the preference should outlive a link from /login
// to /sign-up, not outlive the person at the keyboard. Closing the tab forgets
// it, so the next visit — and the next person on a shared phone — starts with
// the password covered, which is what the dots are for.
//
// The key carries the field's own name, so each box remembers separately: the
// eye on "Contraseña actual" does not decide what "Nueva contraseña" shows.
const revealKey = (field: string) => `password-reveal:${field}`;

// Reading and writing here is wrapped because `sessionStorage` is not always
// there to be used. Private windows and locked-down browser settings make the
// property itself throw on access, and an exception thrown while rendering a
// login form would take the whole form down with it. Forgetting the preference
// is a fine outcome; failing to draw the box to type a password into is not.
function readReveal(key: string) {
    try {
        return sessionStorage.getItem(key) === "true";
    } catch {
        return false;
    }
}

function writeReveal(key: string, revealed: boolean) {
    try {
        sessionStorage.setItem(key, String(revealed));
    } catch {
        // Nothing to do and nothing worth saying: the eye still works for this
        // page, it just will not be remembered on the next one.
    }
}

// `sessionStorage` cannot announce that it changed — the `storage` event fires
// for other tabs, never for the one that did the writing — so the fields tell
// each other. Two boxes built from the same key stay in step because of this:
// /profile draws "Contraseña actual" in both the email form and the password
// form, and one eye there deciding one thing and the other the opposite would
// read as a bug.
const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
    listeners.add(listener);
    return () => {
        listeners.delete(listener);
    };
}

function announce() {
    for (const listener of listeners) listener();
}

// The password box, with an eye to uncover what is in it.
//
// It exists because a password typed blind on a phone is guessed at rather than
// read, and the usual consequence is a login that fails for a typo the person
// cannot see. Every password field on the site goes through here, so uncovering
// works the same way on the login screen as it does on /profile.
//
// The value itself is never touched — only the `type` attribute changes, so the
// browser still treats the box as a password field for autofill and for its own
// password manager.
//
// `type="button"` is load-bearing. A `<button>` inside a `<form>` submits it by
// default, so without this, uncovering the password would try to log you in
// with whatever is typed so far.
export function PasswordInput({
    className,
    id,
    name,
    ...props
}: Omit<React.ComponentProps<"input">, "type">) {
    // The typed password is forgotten on the way out of the screen; see the
    // hook for why that needs saying at all in an app that never unloads.
    const inputRef = useForgetOnLeave();

    const key = revealKey(String(id ?? name ?? "password"));

    // The stored preference is the state; there is no copy of it in `useState`
    // to drift out of date. `useSyncExternalStore` is what makes that safe
    // across the server boundary: this component renders on the server too,
    // where there is no `sessionStorage` to read, so the third argument hands
    // that render a flat `false` and the browser reads the real answer once it
    // takes over. Reading storage directly during render instead would have the
    // server draw dots and the browser draw text from the same markup, which is
    // a hydration mismatch; and the server always guessing "covered" gets it
    // wrong only in the safe direction.
    const revealed = useSyncExternalStore(
        subscribe,
        () => readReveal(key),
        () => false,
    );

    function toggle() {
        writeReveal(key, !revealed);
        announce();
    }

    const label = revealed ? "Ocultar contraseña" : "Mostrar contraseña";

    return (
        // `relative` so the button can be pinned to the field's right edge, and
        // the wrapper is a block rather than a flex row: the input keeps the
        // full width the forms lay out for it, and the button sits over it.
        <div className="relative">
            <input
                {...props}
                id={id}
                name={name}
                ref={inputRef}
                type={revealed ? "text" : "password"}
                // `pr-10` reserves the corner the button occupies, so a long
                // password scrolls under the label rather than behind the eye.
                className={cn(className, "w-full pr-10")}
            />

            <button
                type="button"
                onClick={toggle}
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
