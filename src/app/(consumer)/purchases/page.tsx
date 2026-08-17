import { Suspense } from "react";
import { getCurrentUser } from "@/app/features/users/actions/currentUser";
import { getUserPurchases } from "@/app/features/purchases/db/userPurchases";
import { PurchaseRow } from "@/app/features/purchases/components/PurchaseRow";
import { cinzel } from "@/components/ui/fonts";
import { PlaqueButton } from "@/components/ui/PlaqueButton";
import { CarvedBackdrop } from "@/components/ui/CarvedBackdrop";

// The receipt log behind the Compras tab: every one-time purchase this person
// has made, newest first.
//
// Subscription payments are deliberately not here. Those invoices live in
// Hotmart's own buyer area, and mirroring them
// locally would create a second copy of billing history that can disagree with
// the one Hotmart considers true.
export default function PurchasesPage() {
    return (
        <main
            className={`${cinzel.className} relative min-h-screen w-full`}
        >
            <CarvedBackdrop />

            <div className="mx-auto w-full max-w-4xl px-4 pt-32 pb-16">
                <h1 className="mb-8 text-center text-4xl tracking-widest text-ink">
                    Mis compras
                </h1>

                {/* Everything below the heading depends on who is asking, which
                    is request-time data. The title paints at once and the list
                    streams in behind it. */}
                <Suspense fallback={<PurchasesSkeleton />}>
                    <PurchaseList />
                </Suspense>
            </div>
        </main>
    );
}

async function PurchaseList() {
    const { userId } = await getCurrentUser();

    if (userId == null) return <SignedOut />;

    const purchases = await getUserPurchases(userId);

    if (purchases.length === 0) return <Empty />;

    return (
        <ul className="flex flex-col gap-4">
            {purchases.map(purchase => (
                <PurchaseRow key={purchase.id} purchase={purchase} />
            ))}
        </ul>
    );
}

// Nothing bought yet. Points at the catalogue rather than stopping at "you have
// none", since what to do next is the only useful thing to say here.
function Empty() {
    return (
        <div className="flex flex-col items-center gap-4 py-8 text-center">
            <p className="text-ink-body">
                Todavía no has hecho ninguna compra. Cuando compres un curso,
                aparecerá aquí con su recibo.
            </p>
            <CatalogueLink />
        </div>
    );
}

function SignedOut() {
    return (
        <div className="flex flex-col items-center gap-4 py-8 text-center">
            <p className="text-ink-body">
                Inicia sesión para ver tus compras.
            </p>
            <div className="flex flex-wrap justify-center gap-3">
                <PlaqueButton href="/login">Iniciar sesión</PlaqueButton>
                <CatalogueLink />
            </div>
        </div>
    );
}

function CatalogueLink() {
    return (
        <PlaqueButton href="/products">Ver catálogo</PlaqueButton>
    );
}

function PurchasesSkeleton() {
    return (
        <div className="flex animate-pulse flex-col gap-4">
            {Array.from({ length: 3 }, (_, index) => (
                <div
                    key={index}
                    className="h-32 w-full rounded-2xl border border-gold/20 bg-[#0a1628]/40"
                />
            ))}
        </div>
    );
}
