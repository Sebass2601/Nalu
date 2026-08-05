import { Suspense } from "react";
import Image from "next/image";
import { notFound } from "next/navigation";
import { getPublicProduct } from "@/app/features/products/db/products";
import { cinzel } from "@/components/ui/fonts";
import { PlaqueButton } from "@/components/ui/PlaqueButton";

// Where the buyer lands after the webhook has granted their access. By the time
// this renders the purchase is already recorded — the GET handler on the
// webhook route provisions before redirecting here — so this page only has to
// confirm it and point the way forward.
export default function PurchaseSuccessPage({
    params,
}: {
    params: Promise<{ productId: string }>;
}) {
    return (
        <main
            className={`${cinzel.className} min-h-screen w-full bg-[#0a1628] bg-linear-to-b from-[#12243f] via-[#0d1c31] to-[#0a1628]`}
        >
            <div className="mx-auto max-w-3xl px-4 pt-32 pb-16">
                <Suspense fallback={<SuccessSkeleton />}>
                    <SuccessDetails params={params} />
                </Suspense>
            </div>
        </main>
    );
}

async function SuccessDetails({
    params,
}: {
    params: Promise<{ productId: string }>;
}) {
    const { productId } = await params;
    const product = await getPublicProduct(productId);

    if (product == null) return notFound();

    return (
        <div className="flex flex-col items-center gap-8 text-center">
            <div className="flex flex-col gap-3">
                <p className="text-sm tracking-[0.3em] text-ink-body uppercase">
                    Compra completada
                </p>
                <h1 className="text-5xl tracking-wide text-ink-bright">
                    ¡Gracias por tu compra!
                </h1>
                <p className="text-xl text-ink-body">
                    Ya tienes acceso permanente a {product.name}.
                </p>
            </div>

            <div className="relative aspect-video w-full max-w-md">
                <Image
                    src={product.imageUrl}
                    alt={product.name}
                    fill
                    className="rounded-xl object-contain"
                />
            </div>

            <PlaqueButton href="/products">
                Ver mis cursos
            </PlaqueButton>
        </div>
    );
}

function SuccessSkeleton() {
    return (
        <div className="flex animate-pulse flex-col items-center gap-8">
            <div className="h-4 w-40 rounded bg-gold/10" />
            <div className="h-10 w-96 max-w-full rounded bg-gold/20" />
            <div className="aspect-video w-full max-w-md rounded-xl bg-[#0a1628]/40" />
            <div className="h-14 w-48 rounded-lg bg-gold/10" />
        </div>
    );
}

