import Link from "next/link";
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
        <main className="min-h-screen w-full bg-[#0a1628] bg-linear-to-b from-[#12243f] via-[#0d1c31] to-[#0a1628]">
            <div className="mx-auto max-w-2xl px-4 pt-32 pb-16 text-center">
                <h1 className="mb-4 text-3xl tracking-widest text-ink">
                    Tu pago está en proceso
                </h1>
                <p className="mb-4 text-ink-body">
                    Recibimos tu pedido. Algunos métodos de pago, como PIX o la
                    transferencia bancaria, tardan en acreditarse.
                </p>
                <p className="mb-8 text-ink-body">
                    En cuanto se confirme, el curso aparecerá en{" "}
                    <span className="text-ink">Mis cursos</span> y te avisaremos
                    por correo. No hace falta que hagas nada más.
                </p>
                <div className="flex flex-wrap justify-center gap-3">
                    <PlaqueButton href="/courses">Mis cursos</PlaqueButton>
                    <Link
                        href="/products"
                        className="text-sm text-ink-meta underline underline-offset-4"
                    >
                        Ver catálogo
                    </Link>
                </div>
            </div>
        </main>
    );
}
