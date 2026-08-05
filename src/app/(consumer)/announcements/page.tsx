import { cinzel } from "@/components/ui/fonts";
import { BackLink } from "@/components/ui/BackToHomeLink";

// Behind the globe on the salon table.
//
// Empty on purpose for now: the doorway is drawn and the room it opens onto is
// bare, which is a better answer than a plaque that goes nowhere — a visitor who
// presses something and lands on nothing at all decides the site is broken.
//
// The same navy wash and the same 32 of top padding as every other consumer
// page, that padding being what clears the 96px bar. When there is something to
// announce, the block in the middle is what gives way to it.
export default function AnnouncementsPage() {
    return (
        <main
            className={`${cinzel.className} flex min-h-screen w-full flex-col bg-[#0a1628] bg-linear-to-b from-[#12243f] via-[#0d1c31] to-[#0a1628]`}
        >
            <div className="mx-auto w-full max-w-2xl px-4 pt-32">
                {/* Back to the salon rather than the castle: the globe this
                    page hangs off is on the salon table, and that is where
                    pressing it came from. */}
                <BackLink href="/">Volver al salón</BackLink>
            </div>

            {/* Centred in what is left below the way out, so a page with one
                line on it reads as quiet rather than unfinished. */}
            <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col items-center justify-center gap-4 px-4 pt-12 pb-24 text-center">
                <h1 className="text-4xl tracking-wide text-ink-bright sm:text-5xl">
                    Anuncios
                </h1>
                <p className="text-xl text-ink-body">
                    No hay anuncios por ahora, ¡revisa esta página en el futuro!
                </p>
            </div>
        </main>
    );
}
