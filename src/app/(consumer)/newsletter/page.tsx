import { cinzel } from "@/components/ui/fonts";
import { BackLink } from "@/components/ui/BackToHomeLink";

// Behind the crystal on the salon table.
//
// Empty on purpose for now, like /announcements beside it — the doorway is drawn
// and the room is bare, which beats a plaque that goes nowhere.
//
// Written out rather than shared with that page even though the two are the same
// shape today. They are two stubs on their way to becoming different things: a
// feed of notices on one side and a sign-up on the other, and an abstraction over
// them would be predicting a resemblance that is not going to last.
export default function NewsletterPage() {
    return (
        <main
            className={`${cinzel.className} flex min-h-screen w-full flex-col bg-[#0a1628] bg-linear-to-b from-[#12243f] via-[#0d1c31] to-[#0a1628]`}
        >
            <div className="mx-auto w-full max-w-2xl px-4 pt-32">
                <BackLink href="/">Volver al salón</BackLink>
            </div>

            <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col items-center justify-center gap-4 px-4 pt-12 pb-24 text-center">
                <h1 className="text-4xl tracking-wide text-ink-bright sm:text-5xl">
                    Lecciones semanales gratis
                </h1>
                <p className="text-xl text-ink-body">
                    No hay lecciones por ahora, ¡revisa esta página en el futuro!
                </p>
            </div>
        </main>
    );
}
