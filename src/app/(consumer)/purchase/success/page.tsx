import { cinzel } from "@/components/ui/fonts";
import { PlaqueButton } from "@/components/ui/PlaqueButton";
import { CarvedBackdrop } from "@/components/ui/CarvedBackdrop";

// Where Hotmart sends the buyer after a successful payment.
//
// Fully static. It reads no session, queries nothing, and waits for nothing.
//
// It used to poll: a `<meta http-equiv="refresh">` reloaded every three seconds
// until the purchase row appeared, then forwarded to the product's success
// page. That was a mistake, and an instructive one. The tag is an instruction
// to the BROWSER — "reload this document in three seconds" — not something
// React owns. Next's App Router navigates client-side, swapping content without
// loading a new document, so the reload timer was never cancelled; and Next
// hoists <meta> into <head>, where it survived those navigations and re-armed
// itself. The result was a reload loop that followed the visitor around the
// site long after they had left this page.
//
// The polling bought one thing: auto-forwarding to the course. It cost a bug
// that broke every other page. Access is granted by the webhook regardless of
// whether anyone is looking at this page, so there was never anything here
// worth watching for — one click through to Mis cursos does the same job.
//
// The address is configured per offer in Hotmart's dashboard rather than per
// checkout, so it can carry nothing about who bought what. Nothing here needs
// it to.
export default function PurchaseSuccessPage() {
    return (
        <main
            className={`${cinzel.className} relative min-h-screen w-full`}
        >
            <CarvedBackdrop />

            <div className="mx-auto flex max-w-2xl flex-col items-center gap-8 px-4 pt-32 pb-16 text-center">
                <div className="flex flex-col gap-3">
                    <p className="text-sm tracking-[0.3em] text-ink-body uppercase">
                        Compra confirmada
                    </p>
                    <h1 className="text-5xl tracking-wide text-ink-bright">
                        ¡Gracias por tu compra!
                    </h1>
                    <p className="text-xl text-ink-body">
                        Tu acceso se activa automáticamente en unos segundos. El
                        curso te espera en{" "}
                        <span className="text-ink-bright">Mis cursos</span>.
                    </p>
                    {/* No promise of an email from us: we send none. Hotmart
                        sends its own payment receipt, but its documentation is
                        explicit that for an external members area the access
                        details are the creator's to send — so its mail confirms
                        the charge and says nothing about getting in here. */}
                    <p className="text-base text-ink-meta">
                        Si aún no aparece, recarga la página en un momento.
                    </p>
                </div>

                <div className="flex w-full flex-col items-stretch gap-4 sm:w-auto sm:flex-row sm:items-center sm:justify-center">
                    <PlaqueButton href="/courses" className="w-full sm:w-auto">
                        Mis cursos
                    </PlaqueButton>
                    <PlaqueButton
                        href="/products"
                        variant="secondary"
                        className="w-full sm:w-auto"
                    >
                        Ver catálogo
                    </PlaqueButton>
                </div>
            </div>
        </main>
    );
}
