import { cinzel } from "@/components/ui/fonts";
import { PlaqueButton } from "@/components/ui/PlaqueButton";

// Where the webhook's GET handler sends anyone whose return trip could not be
// turned into a purchase — a missing session ID, a session that is not paid, or
// a database failure while provisioning.
//
// The wording is deliberately careful. This page cannot tell whether the money
// moved: the payment may have succeeded while only our provisioning failed, in
// which case the webhook POST will retry and quietly grant access moments
// later. So it never says "your payment failed" — it says something went wrong
// and tells them what to check, which is true in every one of those cases.
export default function PurchaseFailurePage() {
    return (
        <main
            className={`${cinzel.className} min-h-screen w-full bg-[#0a1628] bg-linear-to-b from-[#12243f] via-[#0d1c31] to-[#0a1628]`}
        >
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

                <div className="flex flex-wrap items-center justify-center gap-4">
                    <PlaqueButton href="/products">
                        Ver mis cursos
                    </PlaqueButton>
                    <PlaqueButton href="/products" variant="secondary">
                        Volver a la tienda
                    </PlaqueButton>
                </div>
            </div>
        </main>
    );
}
