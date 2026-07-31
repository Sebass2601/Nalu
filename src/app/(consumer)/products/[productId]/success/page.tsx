import { Suspense } from "react";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getPublicProduct } from "@/app/features/products/db/products";
import { cinzel } from "@/components/ui/fonts";

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
                <p className="text-xs tracking-[0.3em] text-yellow-200/70 uppercase">
                    Compra completada
                </p>
                <h1 className="text-4xl tracking-wide text-yellow-100">
                    ¡Gracias por tu compra!
                </h1>
                <p className="text-lg text-yellow-200/80">
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

            <Link
                href="/products"
                className="rounded-lg border border-yellow-200/60 px-8 py-4 text-lg tracking-widest text-yellow-200 uppercase transition-colors hover:bg-yellow-200 hover:text-[#0a1628]"
            >
                Ver mis cursos
            </Link>
        </div>
    );
}

function SuccessSkeleton() {
    return (
        <div className="flex animate-pulse flex-col items-center gap-8">
            <div className="h-4 w-40 rounded bg-yellow-200/10" />
            <div className="h-10 w-96 max-w-full rounded bg-yellow-200/20" />
            <div className="aspect-video w-full max-w-md rounded-xl bg-[#0a1628]/40" />
            <div className="h-14 w-48 rounded-lg bg-yellow-200/10" />
        </div>
    );
}

