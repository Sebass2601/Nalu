"use client";

import { useRef } from "react";
import { Dialog as DialogPrimitive } from "radix-ui";
import { CastleIcon, XIcon } from "lucide-react";
import {
    Dialog,
    DialogClose,
    DialogDescription,
    DialogOverlay,
    DialogPortal,
    DialogTitle,
} from "@/components/ui/dialog";
import { PlaqueButton } from "@/components/ui/PlaqueButton";
import { bevelFace, bevelOutline, Diamond } from "@/components/ui/plaque";
import { cinzel } from "@/components/ui/fonts";
import { useOncePerVisit } from "@/components/ui/useOncePerVisit";
import { cn } from "@/lib/utils";

const SEEN = "nalu:castle-welcome-seen";

// Later than the Samhain announcement's default 700ms, by more than the hook's
// polling interval. A visitor whose first page is the castle, during a sale,
// is owed both panels — and this gap is what makes the sale's arrive first and
// this one wait for it to close, rather than the two opening on top of each
// other.
const ARRIVAL_DELAY_MS = 1000;

// The same plaque the Samhain announcement is cut from, in the site's own
// gold rather than the season's orange.
const CUT = 22;
const FACE = bevelFace(CUT);
const RULE = bevelOutline({ cut: CUT, inset: 0, width: 2 });
const HAIRLINE = bevelOutline({ cut: CUT, inset: 7, width: 1 });

// Greets a visitor the first time in a visit that they reach the castle, and
// tells them the one thing the picture cannot: that each plaque on it is a
// category of courses.
//
// One way out, and it is back into the castle. The panel explains the page
// it is standing on, so the button only has to step aside.
export function CastleWelcomePopup() {
    const [open, setOpen] = useOncePerVisit(SEEN, ARRIVAL_DELAY_MS);

    const panel = useRef<HTMLDivElement>(null);

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogPortal>
                <DialogOverlay className="bg-[#050b16]/75 duration-300 supports-backdrop-filter:backdrop-blur-sm" />

                <DialogPrimitive.Content
                    ref={panel}
                    // Focus on the panel rather than the button, for the
                    // reason SamhainPopup gives: no focus ring drawn around a
                    // control nobody has tabbed to.
                    onOpenAutoFocus={event => {
                        event.preventDefault();
                        panel.current?.focus();
                    }}
                    className={cn(
                        cinzel.className,
                        "fixed top-1/2 left-1/2 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 outline-none",
                        "data-open:animate-in data-open:duration-500 data-open:ease-out data-open:fade-in-0 data-open:zoom-in-95 data-open:slide-in-from-bottom-3",
                        "data-closed:animate-out data-closed:duration-150 data-closed:fade-out-0 data-closed:zoom-out-95",
                        "motion-reduce:data-open:zoom-in-100 motion-reduce:data-open:slide-in-from-bottom-0"
                    )}
                >
                    {/* The glow the panel throws on the castle behind it, on
                        its own element so the entrance animation's `filter`
                        does not overwrite it. */}
                    <div
                        className="relative"
                        style={{
                            filter: "drop-shadow(0 0 44px rgba(250,206,73,0.25))",
                        }}
                    >
                        <div
                            className="relative bg-[#0a1628] px-4 pt-9 pb-12 min-[400px]:px-6 sm:px-10"
                            style={{ clipPath: FACE }}
                        >
                            {/* A gold light behind the castle, fading into the
                                navy towards the bottom of the panel. */}
                            <span
                                aria-hidden
                                className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_16%,rgba(250,206,73,0.2),rgba(250,206,73,0.05)_45%,transparent_70%)]"
                            />

                            <div className="relative flex flex-col items-center text-center">
                                {/* The navbar's own castle, so the panel and
                                    the "Explorar" item that leads here are
                                    plainly about the same place. */}
                                <CastleIcon
                                    aria-hidden
                                    className="size-16 text-gold"
                                    strokeWidth={1.5}
                                    style={{
                                        filter: "drop-shadow(0 0 10px rgba(250,206,73,0.45))",
                                    }}
                                />

                                {/* `text-balance` so the title breaks into
                                    two lines of about equal length rather
                                    than leaving "Nalu!" alone on the second. */}
                                <DialogTitle
                                    className={cn(
                                        cinzel.className,
                                        "mt-5 text-[1.6rem] leading-tight font-semibold tracking-[0.05em] text-balance text-gold sm:text-[1.75rem]"
                                    )}
                                    // Written out rather than read from the
                                    // token: a text-shadow needs an alpha.
                                    // Keep it in step with `gold`.
                                    style={{
                                        textShadow:
                                            "0 0 22px rgba(250,206,73,0.4)",
                                    }}
                                >
                                    ¡Bienvenido al Castillo de Cursos de Nalu!
                                </DialogTitle>

                                {/* The site's reading face, as every paragraph
                                    on the consumer side is. */}
                                <DialogDescription className="mt-4 max-w-[32ch] font-sans text-[0.95rem] leading-relaxed tracking-normal text-ink-body">
                                    Cada botón del castillo es una categoría
                                    de cursos diversos. Elige uno para
                                    descubrir los cursos que guarda.
                                </DialogDescription>

                                <PlaqueButton
                                    className="mt-8"
                                    onClick={() => setOpen(false)}
                                >
                                    Explorar el castillo
                                </PlaqueButton>
                            </div>
                        </div>

                        <span
                            aria-hidden
                            className="pointer-events-none absolute inset-0 bg-gold"
                            style={{ clipPath: RULE }}
                        />
                        <span
                            aria-hidden
                            className="pointer-events-none absolute inset-0 bg-gold opacity-35"
                            style={{ clipPath: HAIRLINE }}
                        />
                        <Diamond className="top-0 -translate-y-1/2" />
                        <Diamond className="bottom-0 translate-y-1/2" />
                    </div>

                    <DialogClose
                        aria-label="Cerrar"
                        className="absolute top-4 right-4 rounded-full p-1.5 text-gold/80 transition-colors duration-200 hover:bg-gold/15 hover:text-gold-bright focus-visible:ring-2 focus-visible:ring-gold/70 focus-visible:outline-none"
                    >
                        <XIcon className="size-4" aria-hidden />
                    </DialogClose>
                </DialogPrimitive.Content>
            </DialogPortal>
        </Dialog>
    );
}
