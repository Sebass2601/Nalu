"use client";

import { useEffect, useRef } from "react";

// Gives a field a ref that forgets what was typed into it once you leave the
// screen it sits on.
//
// This is not the default. A route change in this app is not a page load:
// Next.js keeps the screen you came from built and hidden so that going back
// can be instant, and every `<input>` inside it goes on holding whatever was
// typed. Nothing unloads and nothing is rebuilt, so the box that reappears on
// back is the very same element with the very same half-finished text in it —
// a password, a new email address someone thought better of, a name they were
// midway through changing.
//
// What it restores is `defaultValue`, not the empty string. For a box that
// started empty those are the same thing, and for one that started with
// something in it — the name on /profile is filled in with the name on file —
// they are very much not: blanking it would leave the form claiming the person
// had asked to erase their own name. "Back to how the form started" is the rule
// that is right for both.
export function useForgetOnLeave() {
    const ref = useRef<HTMLInputElement>(null);

    // Leaving the screen inside this one document. React tears a hidden
    // screen's effects down, which is what makes this the moment to reset.
    //
    // The element is captured into `node` on the way in rather than read from
    // the ref on the way out: React has already put `ref.current` back to null
    // by the time a cleanup runs, so the closure is the only thing still
    // holding it.
    useEffect(() => {
        const node = ref.current;

        return () => {
            if (node) node.value = node.defaultValue;
        };
    }, []);

    // The other way back to a screen: a real document load away from the site
    // and a real back to it. Browsers — phones especially — may freeze the page
    // whole into the back/forward cache instead of unloading it, then thaw it
    // later with the text still sitting in the box and no teardown having
    // happened at all, so the effect above never runs.
    //
    // `event.persisted` is what separates that from an ordinary fresh load,
    // which is left alone so that whatever the browser's password manager or
    // address autofill puts in the box survives.
    useEffect(() => {
        function handlePageShow(event: PageTransitionEvent) {
            const node = ref.current;
            if (event.persisted && node) node.value = node.defaultValue;
        }

        window.addEventListener("pageshow", handlePageShow);
        return () => window.removeEventListener("pageshow", handlePageShow);
    }, []);

    return ref;
}
