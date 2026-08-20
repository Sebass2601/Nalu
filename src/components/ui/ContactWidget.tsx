"use client";

import Image from "next/image";
import { XIcon } from "lucide-react";

import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";

// The number the school actually answers on, in the international format
// WhatsApp's click-to-chat expects: country code first, digits only, no `+`, no
// leading zero, no spaces or dashes. `wa.me` is WhatsApp's own short domain, and
// it is the whole reason this needs no device detection — on a phone iOS and
// Android hand the domain straight to the installed app, and on a desktop it
// redirects to WhatsApp's "continue to chat" page, which offers Web or the
// desktop app. One href, both cases, decided below the website.
const WHATSAPP_URL = "https://wa.me/50769742717";

// The other half of the panel. Anything that is the site's fault rather than a
// question about the teaching goes here instead, so a refund request does not
// arrive in the same thread as a question about the temario.
const CONTACT_EMAIL = "info@naluescuela.com";

// Lucide dropped brand marks over trademark concerns, so the glyph is inlined.
// Sized by the caller through `className` rather than carrying its own width, so
// the corner button and the green button can share it.
function WhatsAppGlyph({ className }: { className?: string }) {
    return (
        <svg
            viewBox="0 0 24 24"
            fill="currentColor"
            aria-hidden="true"
            className={className}
        >
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z" />
        </svg>
    );
}

// A way to reach the school from anywhere on the site: a mark in the corner that
// opens a panel with the two doors — WhatsApp for anything about the teaching,
// email for anything about the site itself.
//
// Built on the Radix dialog the rest of the site already uses rather than a
// `useState` panel of its own. That is not ceremony: it is what makes Escape
// close it, keeps the keyboard inside it while it is open, stops the page behind
// it scrolling, restores focus to the corner mark on close, and marks the rest
// of the document hidden from screen readers for the duration. A hand-rolled
// panel looks identical and silently does none of it.
export function ContactWidget() {
    return (
        <Dialog>
            {/* Navy and gold rather than a solid WhatsApp-green disc. The green
                disc is the more recognisable object in the abstract, but this one
                sits over every page of a navy-and-gold site permanently, and at
                that duty cycle it stops reading as "the school's contact" and
                starts reading as a third-party widget someone bolted on. The
                glyph keeps its brand green, so what it IS stays unmistakable
                while the chrome around it belongs here. Full brand green is
                spent inside the panel, on the button that actually leaves.

                56px on a phone and 64px from `sm` up: comfortably past the 44px
                a fingertip needs, and short of the size where a fixed object
                starts competing with the page it floats over.

                Held off the bottom edge by the home indicator's height on the
                phones that have one and by nothing on the ones that don't —
                `env()` resolves to 0px when there is no inset to clear. Without
                it the mark sits under the swipe bar on an iPhone.

                `z-40` puts it over the page and under the navbar's `z-50`. They
                never meet — one is pinned to the top and the other to the
                bottom — but the panel this opens is `z-50` and must cover it. */}
            <DialogTrigger
                aria-label="Contactar a Nalu Escuela Holística"
                className="fixed right-4 bottom-[calc(1rem+env(safe-area-inset-bottom))] z-40 flex size-14 items-center justify-center rounded-full border border-gold/50 bg-[#0a1628]/95 shadow-lg shadow-black/40 backdrop-blur-md transition-all duration-200 hover:border-gold hover:bg-[#0a1628] focus-visible:ring-2 focus-visible:ring-gold/60 focus-visible:outline-none active:translate-y-px sm:right-6 sm:bottom-[calc(1.5rem+env(safe-area-inset-bottom))] sm:size-16"
            >
                <WhatsAppGlyph className="size-7 text-[#25D366] sm:size-8" />
            </DialogTrigger>

            {/* The shared `DialogContent` is dressed for the admin side: a
                `bg-popover` surface and a `ring-foreground/10` edge, both of
                which are the greyscale shadcn tokens rather than this site's
                palette. What is overridden here is exactly that — navy face,
                gold outline — in the same language as the user menu's panel, so
                the two read as parts of one site.

                `pt-14` is what the logo costs: it hangs half above the top edge,
                so the text needs to start below where it lands.

                `showCloseButton={false}` because the built-in one is a greyscale
                ghost button — near-invisible on navy. A gold one replaces it. */}
            <DialogContent
                showCloseButton={false}
                className="flex flex-col gap-0 rounded-2xl border border-gold/50 bg-[#0a1628]/95 px-6 pt-14 pb-6 font-sans tracking-normal text-ink-body shadow-lg shadow-black/40 ring-0 backdrop-blur-md"
            >
                {/* Straddling the outline: the box is `size-20`, so `-top-10`
                    puts its centre exactly on the top edge and leaves half of it
                    standing above the panel.

                    `overflow-hidden` on the circle rather than on the panel —
                    the panel must NOT clip, or it would cut the logo off at the
                    very edge it is meant to sit on. */}
                <div className="absolute -top-10 left-1/2 flex size-20 -translate-x-1/2 items-center justify-center overflow-hidden rounded-full border border-gold/60 bg-[#0a1628] shadow-lg shadow-black/40">
                    <Image
                        src="/nalu_logo.png"
                        alt=""
                        width={80}
                        height={80}
                        className="size-16 object-contain"
                    />
                </div>

                {/* Radix requires a title — without one it warns, and a screen
                    reader announces the panel with nothing to call it. The logo
                    is the visual title, so this one is read but not drawn rather
                    than adding a heading the design does not want. */}
                <DialogTitle className="sr-only">
                    Contactar a Nalu Escuela Holística
                </DialogTitle>

                <DialogClose
                    aria-label="Cerrar"
                    className="absolute top-3 right-3 rounded-full p-1 text-gold/70 transition-colors duration-200 hover:bg-gold/10 hover:text-gold focus-visible:ring-2 focus-visible:ring-gold/60 focus-visible:outline-none"
                >
                    <XIcon className="size-4" aria-hidden />
                </DialogClose>

                {/* Ink, not gold. `globals.css` reserves gold for what you press
                    or navigate by, and spells out that a gold sentence is a
                    mistake — so the two passages here are ink and the two things
                    you can act on, the button and the address, are not. */}
                <p className="text-center text-sm leading-relaxed">
                    Cualquier consulta sobre los cursos, preguntas del temario, o
                    preguntas personalizadas, contactar a Nalu Escuela Holística
                    a través de este número:
                </p>

                {/* The one place the full brand green is spent. `_blank` so a
                    student reading a lesson does not lose it to the chat, and
                    `noopener noreferrer` because a `_blank` link otherwise hands
                    the opened page a live handle on this one. */}
                <a
                    href={WHATSAPP_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-5 inline-flex items-center justify-center gap-2 self-center rounded-full bg-[#25D366] px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-black/30 transition-colors duration-200 hover:bg-[#1DA851] focus-visible:ring-2 focus-visible:ring-[#25D366]/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0a1628] focus-visible:outline-none active:translate-y-px"
                >
                    <WhatsAppGlyph className="size-5" />
                    Contactar Ahora
                </a>

                {/* The same hairline the user menu separates its items with. */}
                <div className="my-6 h-px bg-gold/20" />

                <p className="text-center text-sm leading-relaxed">
                    Cualquier error con la página web, con los pagos, o necesidad
                    de reembolso, contactar a este mail:
                </p>

                <a
                    href={`mailto:${CONTACT_EMAIL}`}
                    className="mt-2 self-center rounded-sm text-center text-sm font-semibold text-gold underline-offset-4 transition-colors duration-200 hover:text-gold-bright hover:underline focus-visible:ring-2 focus-visible:ring-gold/60 focus-visible:outline-none"
                >
                    {CONTACT_EMAIL}
                </a>
            </DialogContent>
        </Dialog>
    );
}
