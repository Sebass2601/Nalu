import Link from "next/link";
import { cinzel } from "@/components/ui/fonts";

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
                    <p className="text-xs tracking-[0.3em] text-yellow-200/70 uppercase">
                        Algo salió mal
                    </p>
                    <h1 className="text-4xl tracking-wide text-yellow-100">
                        No pudimos confirmar tu compra
                    </h1>
                    <p className="text-lg text-yellow-200/80">
                        Si el cobro se realizó, tu acceso se activará en unos
                        minutos de forma automática. Revisa tus cursos antes de
                        intentar pagar de nuevo.
                    </p>
                </div>

                <div className="flex flex-wrap items-center justify-center gap-4">
                    <Link
                        href="/products"
                        className="rounded-lg border border-yellow-200/60 px-8 py-3 tracking-widest text-yellow-200 uppercase transition-colors hover:bg-yellow-200 hover:text-[#0a1628]"
                    >
                        Ver mis cursos
                    </Link>
                    <Link
                        href="/products"
                        className="rounded-lg border border-yellow-200/30 px-8 py-3 tracking-widest text-yellow-200/80 uppercase transition-colors hover:border-yellow-200/60 hover:text-yellow-200"
                    >
                        Volver a la tienda
                    </Link>
                </div>
            </div>
        </main>
    );
}
