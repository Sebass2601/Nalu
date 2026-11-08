"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { GoogleAnalytics } from "@next/third-parties/google";
import { cinzel } from "@/components/ui/fonts";
import {
    CONSENT_STORAGE_KEY,
    OPEN_COOKIE_SETTINGS_EVENT,
} from "@/lib/analytics";

// The cookie notice, for visitors who have to be asked (see
// `needsCookieConsent`), and the Google Analytics it guards.
//
// Nothing from Google loads until the visitor presses "Aceptar". Their answer
// is kept in their own browser, so the notice appears once rather than on
// every visit, and the footer's "Cookies" link reopens it to change their mind.
//
// Visitors who need not be asked never reach this component: the server sends
// them Google Analytics directly — see `Analytics`.

type Choice = "granted" | "denied";

// Announces a change of answer within this tab. The browser's own `storage`
// event covers other tabs, but never fires in the tab that made the change.
const CHOICE_CHANGED_EVENT = "nalu:cookie-consent-changed";

// Kept in memory as well, for browsers that refuse localStorage (some private
// modes throw on it). There the answer lasts for the visit only, which is the
// most that can be done, and still honours it while the visitor is here.
let choiceInMemory: Choice | null = null;

function readChoice(): Choice | null {
    try {
        const stored = localStorage.getItem(CONSENT_STORAGE_KEY);
        if (stored === "granted" || stored === "denied") return stored;
        return null;
    } catch {
        return choiceInMemory;
    }
}

function saveChoice(choice: Choice) {
    choiceInMemory = choice;
    try {
        localStorage.setItem(CONSENT_STORAGE_KEY, choice);
    } catch {}
    window.dispatchEvent(new Event(CHOICE_CHANGED_EVENT));
}

function subscribe(onChange: () => void) {
    window.addEventListener("storage", onChange);
    window.addEventListener(CHOICE_CHANGED_EVENT, onChange);
    return () => {
        window.removeEventListener("storage", onChange);
        window.removeEventListener(CHOICE_CHANGED_EVENT, onChange);
    };
}

// What the server renders, before the browser's stored answer can be read: not
// yet known, so neither the notice nor the analytics are drawn. Without it the
// notice would flash up for a visitor who had already answered.
const NOT_READ_YET = "not-read-yet" as const;

export function CookieConsent({ gaId }: { gaId: string }) {
    const choice = useSyncExternalStore<Choice | null | typeof NOT_READ_YET>(
        subscribe,
        readChoice,
        () => NOT_READ_YET
    );
    const [reopened, setReopened] = useState(false);

    useEffect(() => {
        const reopen = () => setReopened(true);
        window.addEventListener(OPEN_COOKIE_SETTINGS_EVENT, reopen);
        return () =>
            window.removeEventListener(OPEN_COOKIE_SETTINGS_EVENT, reopen);
    }, []);

    function decide(next: Choice) {
        const withdrawing = choice === "granted" && next === "denied";
        saveChoice(next);
        setReopened(false);

        // Google's script is already running in this page and cannot be
        // unloaded, and the cookies it set are already in the browser. So a
        // withdrawal deletes those cookies and reloads: the fresh page reads
        // "denied" and never loads Google at all.
        if (withdrawing) {
            deleteAnalyticsCookies();
            window.location.reload();
        }
    }

    return (
        <>
            {choice === "granted" && <GoogleAnalytics gaId={gaId} />}
            {(choice === null || reopened) && (
                <Notice
                    current={choice === NOT_READ_YET ? null : choice}
                    onDecide={decide}
                />
            )}
        </>
    );
}

// The footer's "Cookies" link, for visitors who were shown the notice. A
// button, not a link: it opens the notice on the page the visitor is on rather
// than taking them anywhere.
export function CookieSettingsButton({ className }: { className?: string }) {
    return (
        <button
            type="button"
            className={className}
            onClick={() =>
                window.dispatchEvent(new Event(OPEN_COOKIE_SETTINGS_EVENT))
            }
        >
            Cookies
        </button>
    );
}

// Google Analytics keeps `_ga` and one `_ga_<id>` per property, set on the
// site's top domain (".naluescuela.com") so they cover every subdomain. A
// cookie can only be deleted with the same domain it was set with, and which
// form was used is not visible from here, so each is cleared under every form
// it could have.
function deleteAnalyticsCookies() {
    const host = window.location.hostname;
    const names = document.cookie
        .split(";")
        .map(cookie => cookie.split("=")[0].trim())
        .filter(name => name === "_ga" || name.startsWith("_ga_"));

    for (const name of names) {
        for (const domain of ["", `; domain=${host}`, `; domain=.${host}`]) {
            document.cookie = `${name}=; Max-Age=0; path=/${domain}`;
        }
    }
}

// The notice itself.
//
// Both answers are the same size and the same style. The law asks that
// refusing be as easy as accepting, and a bright "Aceptar" beside a faint
// "Rechazar" is precisely the pattern regulators have fined.
//
// Not a dialog: it blocks nothing, and the page underneath stays usable for
// anyone who would rather not answer yet — which means no analytics, the same
// as refusing. A dialog role would also make the castle's welcome pop-up wait
// for it (useOncePerVisit holds back while any dialog is open).
//
// Bottom-left on a wide screen, clear of the contact mark in the right corner;
// across the bottom on a phone, where there is no room beside it, and over the
// mark until the visitor answers. `z-45` sits between that mark (40) and the
// navbar and pop-ups (50).
function Notice({
    current,
    onDecide,
}: {
    current: Choice | null;
    onDecide: (choice: Choice) => void;
}) {
    return (
        <section
            aria-label="Aviso de cookies"
            className="fixed inset-x-3 bottom-[calc(0.75rem+env(safe-area-inset-bottom))] z-45 flex flex-col gap-4 rounded-2xl border border-gold/50 bg-[#0a1628]/95 p-5 shadow-lg shadow-black/40 backdrop-blur-md sm:right-auto sm:bottom-[calc(1.5rem+env(safe-area-inset-bottom))] sm:left-6 sm:max-w-md"
        >
            <h2 className={`${cinzel.className} text-lg tracking-wide text-ink-bright`}>
                Cookies
            </h2>
            <p className="font-sans text-sm leading-relaxed text-ink-body">
                Usamos cookies de Google Analytics para saber cuántas personas
                nos visitan y mejorar la escuela. Solo las activamos si nos das
                permiso.{" "}
                <Link
                    href="/terminos#cookies"
                    className="text-gold underline underline-offset-2 hover:text-ink-bright"
                >
                    Más información
                </Link>
            </p>
            {current != null && (
                <p className="font-sans text-xs text-ink-meta">
                    Ahora mismo están{" "}
                    {current === "granted" ? "aceptadas" : "rechazadas"}.
                </p>
            )}
            <div className="flex gap-3">
                <AnswerButton onClick={() => onDecide("denied")}>
                    Rechazar
                </AnswerButton>
                <AnswerButton onClick={() => onDecide("granted")}>
                    Aceptar
                </AnswerButton>
            </div>
        </section>
    );
}

function AnswerButton({
    onClick,
    children,
}: {
    onClick: () => void;
    children: string;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={`${cinzel.className} flex-1 rounded-lg border border-gold/60 px-4 py-2 tracking-widest text-gold transition-colors duration-200 hover:bg-gold/10 focus-visible:ring-2 focus-visible:ring-gold/60 focus-visible:outline-none`}
        >
            {children}
        </button>
    );
}
