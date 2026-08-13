import { cinzel } from "@/components/ui/fonts";
import { PlaqueButton } from "@/components/ui/PlaqueButton";

// Where Hotmart sends a buyer whose payment has not cleared yet.
//
// Hotmart's thank-you configuration takes a separate URL for this case, which
// is why it exists as its own page rather than a branch of the success one. PIX
// and boleto can take hours to confirm, and the two situations need genuinely
// different copy: the success page says "wait a moment", this one says "come
// back later, we will write to you".
//
// Telling someone their course is ready when the money has not arrived would be
// a lie; showing them the waiting spinner from the success page for six hours
// would be worse.
export default function PurchasePendingPage() {
    return (
        <main
            className={`${cinzel.className} min-h-screen w-full bg-[#0a1628] bg-linear-to-b from-[#12243f] via-[#0d1c31] to-[#0a1628]`}
        >
            <div className="mx-auto flex max-w-2xl flex-col items-center gap-8 px-4 pt-32 pb-16 text-center">
                <div className="flex flex-col gap-3">
                    <p className="text-sm tracking-[0.3em] text-ink-body uppercase">
                        Pago en proceso
                    </p>
                    <h1 className="text-5xl tracking-wide text-ink-bright">
                        Tu pago está en proceso
                    </h1>
                    <p className="text-xl text-ink-body">
                        Recibimos tu pedido. Algunos métodos de pago, como PIX o
                        la transferencia bancaria, tardan en acreditarse.
                    </p>
                    {/* No promise of an email from us. Hotmart sends its own
                        payment confirmation, but its documentation is explicit
                        that for an external members area the access details are
                        the creator's to send — and we send none. So this points
                        at the one thing that is actually true: the course turns
                        up on its own. */}
                    <p className="text-xl text-ink-body">
                        En cuanto se confirme, el curso aparecerá solo en{" "}
                        <span className="text-ink-bright">Mis cursos</span>. No
                        hace falta que hagas nada más — vuelve cuando quieras.
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
