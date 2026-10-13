"use client";

import { useEffect, useRef, useState } from "react";
import { Dialog as DialogPrimitive } from "radix-ui";
import { XIcon } from "lucide-react";
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
import { cn } from "@/lib/utils";

// Whether this visit has already been told about the sale.
//
// sessionStorage, for the reason the parallax hint gives: it is once per visit,
// not once per device. Someone who closed it this morning and comes back
// tonight is arriving again, and the sale is still on. Within a visit it is
// shown exactly once — reloading, or moving between pages, does not bring it
// back.
const SEEN = "nalu:samhain-announcement-seen";

// How long the page is left alone before the panel arrives. Long enough that
// the visitor has seen where they are — a panel that is already there when the
// page paints reads as part of the page, or as something in its way — and
// short enough that they have not started doing anything yet.
const ARRIVAL_DELAY_MS = 700;

// How often to look for the loading curtain while it is still up.
const CURTAIN_POLL_MS = 150;

// The curtain the two parallax pages hold over themselves while their artwork
// downloads — see ParallaxCurtain, which carries this attribute for exactly
// this question. It covers the whole screen and sits above this panel, so a
// panel opened behind it would spend its entrance where nobody can see it and
// be found already standing there when the curtain lifts.
const curtainIsUp = () => document.querySelector("[data-curtain]") != null;

// The panel is the site's plaque — the bevelled octagon the doorways and the
// buttons are cut from — at the size of a notice rather than a control. A
// rounded rectangle here would be a pop-up from some other website.
// What the sale takes off, as the school announces it: one figure, the same for
// every visitor.
//
// This is copy, like the title — written here, not worked out from the
// products' prices. Nothing checks it against them, so a promotion set at some
// other percentage is still announced as this one. If the campaign changes,
// this is the line to change.
const OFFER = "20% de descuento";

const CUT = 22;
const FACE = bevelFace(CUT);
const RULE = bevelOutline({ cut: CUT, inset: 0, width: 2 });
const HAIRLINE = bevelOutline({ cut: CUT, inset: 7, width: 1 });

// Announces the Samhain promotion, once per visit, with one way forward: the
// full catalogue, where every discounted course is marked.
//
// Rendered only when there is a promotion to announce — `SamhainAnnouncement`
// decides that on the server and hands down nothing but what the panel says.
// This component's whole job is WHEN: not twice, and not under the curtain.
export function SamhainPopup({
    endsOn,
}: {
    // The day the first promotion ends, already written out — "31 de octubre"
    // — or null when there is no date to give. Formatted on the server so it
    // is read in the school's time zone rather than the visitor's.
    endsOn: string | null;
}) {
    // Starts closed, and has to: sessionStorage does not exist where this is
    // first rendered, so a server that guessed "open" would hand the browser a
    // panel it then had to take away from everyone who had already seen it.
    const [open, setOpen] = useState(false);

    const panel = useRef<HTMLDivElement>(null);

    useEffect(() => {
        // Wrapped because sessionStorage throws, rather than returning null,
        // when a browser has storage switched off. `seen` defaults to true so
        // that case shows nothing: a panel that cannot remember being closed
        // would come back on every page, and that is worse than not telling
        // someone about a sale.
        let seen = true;
        try {
            seen = sessionStorage.getItem(SEEN) != null;
        } catch {}
        if (seen) return;

        let arrival: ReturnType<typeof setTimeout> | undefined;

        const arrive = () => {
            arrival = setTimeout(() => {
                // Remembered as it opens, not as it closes. "Seen" is what the
                // key says, and a visitor who reloads with the panel still up
                // has seen it.
                try {
                    sessionStorage.setItem(SEEN, "1");
                } catch {}
                setOpen(true);
            }, ARRIVAL_DELAY_MS);
        };

        if (!curtainIsUp()) {
            arrive();
            return () => clearTimeout(arrival);
        }

        // Polled rather than observed. The curtain leaves by unmounting, which
        // a MutationObserver could catch — but only by watching the whole
        // document while the page is still streaming in, to learn one thing
        // that is true within a second or two either way.
        const poll = setInterval(() => {
            if (curtainIsUp()) return;
            clearInterval(poll);
            arrive();
        }, CURTAIN_POLL_MS);

        return () => {
            clearInterval(poll);
            clearTimeout(arrival);
        };
    }, []);

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogPortal>
                {/* Darker than the shared overlay's 10% black, which is tuned
                    for the admin's small confirmations. This one interrupts on
                    purpose, and the page behind it has to step back far enough
                    that a panel lit in orange is the only warm thing left. */}
                <DialogOverlay className="bg-[#050b16]/75 duration-300 supports-backdrop-filter:backdrop-blur-sm" />

                <DialogPrimitive.Content
                    ref={panel}
                    // Focus goes to the panel itself rather than to the first
                    // thing in it. Radix's default would land on the button,
                    // which draws its focus ring around a control nobody has
                    // tabbed to and leaves a stray Enter one keypress from
                    // navigating away. From here, Tab reaches the button first.
                    onOpenAutoFocus={event => {
                        event.preventDefault();
                        panel.current?.focus();
                    }}
                    className={cn(
                        cinzel.className,
                        "fixed top-1/2 left-1/2 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 outline-none",
                        // The one piece of motion the page performs on its own,
                        // so it is given room: half a second to arrive, rising
                        // a little as it does. It leaves in a fraction of that
                        // — dismissing something should never have to be waited
                        // for.
                        "data-open:animate-in data-open:duration-500 data-open:ease-out data-open:fade-in-0 data-open:zoom-in-95 data-open:slide-in-from-bottom-3",
                        "data-closed:animate-out data-closed:duration-150 data-closed:fade-out-0 data-closed:zoom-out-95",
                        // Reduced motion keeps the fade and drops the travel.
                        "motion-reduce:data-open:zoom-in-100 motion-reduce:data-open:slide-in-from-bottom-0"
                    )}
                >
                    {/* The glow the panel throws on the page behind it.
                        `drop-shadow` rather than `box-shadow`, because the
                        panel is a clip-path and a box-shadow would be clipped
                        away with the corners. On its own element so it is not
                        fought over by the entrance animation above, which
                        animates `filter` too. */}
                    <div
                        className="relative"
                        style={{
                            filter: "drop-shadow(0 0 44px rgba(255,117,24,0.3))",
                        }}
                    >
                        {/* Narrower gutters below 400px. The button does not
                            wrap — no plaque does — so its width is fixed by its
                            lettering, and on a 320px phone the usual padding
                            leaves it less room than that. */}
                        <div
                            className="relative bg-[#0a1628] px-4 pt-9 pb-12 min-[400px]:px-6 sm:px-10"
                            style={{ clipPath: FACE }}
                        >
                            {/* A warm light behind the pumpkin. One source,
                                placed where it sits, so the top of the panel
                                glows and the bottom falls away into the navy.
                                It is also what the pumpkin's dark outline is
                                read against: on bare navy that outline would
                                vanish into the panel. */}
                            <span
                                aria-hidden
                                className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_18%,rgba(255,117,24,0.26),rgba(255,117,24,0.07)_45%,transparent_70%)]"
                            />

                            <div className="relative flex flex-col items-center text-center">
                                <Pumpkin />

                                <DialogTitle
                                    className={cn(
                                        cinzel.className,
                                        "mt-5 text-[1.7rem] leading-tight font-semibold tracking-[0.06em] text-pumpkin sm:text-3xl"
                                    )}
                                    // Written out rather than read from the
                                    // token, as the doorways' glow is: a
                                    // text-shadow needs an alpha to fade, and
                                    // a CSS variable cannot be given one
                                    // inline. Keep it in step with `pumpkin`.
                                    style={{
                                        textShadow:
                                            "0 0 22px rgba(255,117,24,0.45)",
                                    }}
                                >
                                    Festividad de Samhain
                                </DialogTitle>

                                {/* Ink, not pumpkin. The title is already the
                                    season's colour and the button below is its
                                    solid plaque; a third orange thing between
                                    them would leave the eye nowhere to land. */}
                                <p className="mt-3 text-xl tracking-[0.04em] text-ink-bright">
                                    {OFFER}
                                </p>

                                {/* The site's reading face, as every paragraph
                                    on the consumer side is. Cinzel stays on the
                                    two lines above, which are lettering. */}
                                <DialogDescription className="mt-4 max-w-[32ch] font-sans text-[0.95rem] leading-relaxed tracking-normal text-ink-body">
                                    Celebramos la temporada con precios
                                    especiales en cursos seleccionados.
                                    {endsOn != null &&
                                        ` Disponibles hasta el ${endsOn}.`}
                                </DialogDescription>

                                {/* Says where it goes, and closes the panel on
                                    the way. Without the close, a visitor who
                                    is already on the catalogue would press it
                                    and watch nothing happen: a link to the
                                    page you are on is not a navigation. */}
                                <PlaqueButton
                                    href="/products"
                                    variant="pumpkin"
                                    className="mt-8"
                                    onClick={() => setOpen(false)}
                                >
                                    Ver los cursos
                                </PlaqueButton>
                            </div>
                        </div>

                        {/* The rules sit on top of the face, as on every plaque:
                            the outer one in the season's colour, and a fainter
                            one inside it. */}
                        <span
                            aria-hidden
                            className="pointer-events-none absolute inset-0 bg-pumpkin"
                            style={{ clipPath: RULE }}
                        />
                        <span
                            aria-hidden
                            className="pointer-events-none absolute inset-0 bg-pumpkin opacity-35"
                            style={{ clipPath: HAIRLINE }}
                        />
                        <Diamond
                            metal="pumpkin"
                            className="top-0 -translate-y-1/2"
                        />
                        <Diamond
                            metal="pumpkin"
                            className="bottom-0 translate-y-1/2"
                        />
                    </div>

                    {/* Last in the markup so the button above is the first stop
                        for Tab, and drawn in the corner regardless. Set in from
                        the edge by more than its own size is cut away there —
                        the corner of this panel is a diagonal, not a point. */}
                    <DialogClose
                        aria-label="Cerrar"
                        className="absolute top-4 right-4 rounded-full p-1.5 text-pumpkin/80 transition-colors duration-200 hover:bg-pumpkin/15 hover:text-pumpkin-bright focus-visible:ring-2 focus-visible:ring-pumpkin/70 focus-visible:outline-none"
                    >
                        <XIcon className="size-4" aria-hidden />
                    </DialogClose>
                </DialogPrimitive.Content>
            </DialogPortal>
        </Dialog>
    );
}

// The pumpkin the panel is headed by: solid orange, outlined in the site's
// navy — the same near-black the lettering on a gold or pumpkin plaque is cut
// in, which is why it reads as black here without being a colour the site does
// not otherwise use.
//
// The body is five ellipses laid over one another, outer pair first, so each
// one's outline is drawn over the last and the overlaps become the ribs without
// a single rib being drawn. The three tones follow that order — deepest at the
// sides, brightest on the lobe facing the viewer — which is all that keeps a
// flat orange shape from reading as a disc.
//
// It has no face and nothing on it moves. It began as a carved lantern with a
// flickering candle behind the eyes; what was asked for instead is the fruit
// itself, and a plain pumpkin is the harvest where a jack-o'-lantern is only
// the one night.
function Pumpkin() {
    return (
        <svg
            viewBox="0 0 120 108"
            aria-hidden
            className="h-24 w-auto"
            // A halo of its own colour, outside the outline. Without it the
            // dark edge has only the panel's dim glow to stand against.
            style={{ filter: "drop-shadow(0 0 10px rgba(255,117,24,0.45))" }}
        >
            <g
                className="stroke-[#0a1628]"
                strokeWidth="3"
                strokeLinejoin="round"
            >
                {/* The stem first, so the body is drawn over its foot. */}
                <path
                    d="M55 30c0-8 2-14 7-20l7 4c-3 4-4 9-4 16z"
                    className="fill-pumpkin-deep"
                />
                <ellipse cx="33" cy="65" rx="23" ry="31" className="fill-pumpkin-deep" />
                <ellipse cx="87" cy="65" rx="23" ry="31" className="fill-pumpkin-deep" />
                <ellipse cx="46" cy="65" rx="22" ry="35" className="fill-pumpkin" />
                <ellipse cx="74" cy="65" rx="22" ry="35" className="fill-pumpkin" />
                <ellipse cx="60" cy="65" rx="17" ry="37" className="fill-pumpkin-bright" />
            </g>
        </svg>
    );
}
