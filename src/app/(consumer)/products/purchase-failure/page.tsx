import { cinzel } from "@/components/ui/fonts";
import { PlaqueButton } from "@/components/ui/PlaqueButton";
import { CarvedBackdrop } from "@/components/ui/CarvedBackdrop";

// Where a purchase attempt lands when it cannot be turned into anything.
//
// It used to be reached from the webhook's GET handler, which provisioned
// access on the buyer's return trip. That handler is gone: Hotmart's thank-you
// URL is configured per offer rather than per checkout and carries no
// trustworthy per-buyer token, so /purchase/success waits for the webhook
// instead. This page remains as the destination for a checkout that could not
// be started at all.
//
// The wording is deliberately careful. This page cannot tell whether the money
// moved: a payment may have succeeded while only our provisioning failed, in
// which case the webhook will retry and quietly grant access moments later. So
// it never says "your payment failed" — it says something went wrong and tells
// them what to check, which is true in every one of those cases.
export default function PurchaseFailurePage() {
    return (
        <main
            className={`${cinzel.className} relative min-h-screen w-full`}
        >
            <CarvedBackdrop />

            <div className="mx-auto flex max-w-2xl flex-col items-center gap-8 px-4 pt-32 pb-16 text-center">
                <div className="flex flex-col gap-3">
                    <p className="text-sm tracking-[0.3em] text-ink-body uppercase">
                        Algo salió mal
                    </p>
                    <h1 className="text-5xl tracking-wide text-ink-bright">
                        No pudimos confirmar tu compra
                    </h1>
                    <p className="text-xl text-ink-body">
                        Si el cobro se realizó, tu acceso se activará en unos
                        minutos de forma automática. Revisa tus cursos antes de
                        intentar pagar de nuevo.
                    </p>
                </div>

                {/* "Ver mis cursos" pointed at /products, the catalogue — the
                    same place as the button beside it, so the two offered one
                    destination between them. The shelf is /courses. */}
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
