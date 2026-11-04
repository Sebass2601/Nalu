"use client";

import { useEffect, useState } from "react";

// How long the page is left alone before a panel arrives. Long enough that the
// visitor has seen where they are — a panel that is already there when the page
// paints reads as part of the page, or as something in its way — and short
// enough that they have not started doing anything yet.
const ARRIVAL_DELAY_MS = 700;

// How often to look again while the stage is not yet clear.
const POLL_MS = 150;

// The curtain the two parallax pages hold over themselves while their artwork
// downloads — see ParallaxCurtain, which carries this attribute for exactly
// this question. It covers the whole screen and sits above any panel, so a
// panel opened behind it would spend its entrance where nobody can see it and
// be found already standing there when the curtain lifts.
const curtainIsUp = () => document.querySelector("[data-curtain]") != null;

// Another panel already open. Two notices stacked on one another leave the
// visitor closing one only to find a second underneath, so a panel that finds
// the stage taken waits its turn and arrives after the first is dismissed.
const dialogIsOpen = () => document.querySelector('[role="dialog"]') != null;

// The open state for a panel that is shown once per visit: the first time this
// visit reaches a page that renders it, after the curtain has lifted and any
// other panel has closed, and never again until the visitor comes back.
//
// sessionStorage, for the reason the parallax hint gives: it is once per visit,
// not once per device. Someone who closed it this morning and comes back
// tonight is arriving again. Within a visit it is shown exactly once —
// reloading, or moving between pages, does not bring it back.
//
// Remembered as it opens, not as it closes. "Seen" is what the key says, and a
// visitor who reloads with the panel still up has seen it.
//
// `delayMs` lets two panels that could land on the same page be told apart in
// time: the later one finds the earlier already open, and waits for it. The
// gap between them has to be wider than POLL_MS, or both could look in the
// same instant, find nothing, and open together.
export function useOncePerVisit(key: string, delayMs = ARRIVAL_DELAY_MS) {
    // Starts closed, and has to: sessionStorage does not exist where this is
    // first rendered, so a server that guessed "open" would hand the browser a
    // panel it then had to take away from everyone who had already seen it.
    const [open, setOpen] = useState(false);

    useEffect(() => {
        // Wrapped because sessionStorage throws, rather than returning null,
        // when a browser has storage switched off. `seen` defaults to true so
        // that case shows nothing: a panel that cannot remember being closed
        // would come back on every page, and that is worse than missing it.
        let seen = true;
        try {
            seen = sessionStorage.getItem(key) != null;
        } catch {}
        if (seen) return;

        const stageIsClear = () => !curtainIsUp() && !dialogIsOpen();

        let poll: ReturnType<typeof setInterval> | undefined;
        let arrival: ReturnType<typeof setTimeout> | undefined;

        const arrive = () => {
            arrival = setTimeout(() => {
                // Looked at again, because the stage can be taken during the
                // delay — by a panel on a shorter one, say.
                if (!stageIsClear()) {
                    waitForStage();
                    return;
                }
                try {
                    sessionStorage.setItem(key, "1");
                } catch {}
                setOpen(true);
            }, delayMs);
        };

        // Polled rather than observed. The curtain leaves by unmounting, which
        // a MutationObserver could catch — but only by watching the whole
        // document while the page is still streaming in, to learn one thing
        // that is true within a second or two either way.
        const waitForStage = () => {
            if (stageIsClear()) {
                arrive();
                return;
            }
            poll = setInterval(() => {
                if (!stageIsClear()) return;
                clearInterval(poll);
                arrive();
            }, POLL_MS);
        };

        waitForStage();

        return () => {
            clearInterval(poll);
            clearTimeout(arrival);
        };
    }, [key, delayMs]);

    return [open, setOpen] as const;
}
