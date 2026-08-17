import { Fragment, Suspense } from "react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { cacheTag } from "next/cache";
import { db } from "@/drizzle/db";
import { PurchaseTable } from "@/drizzle/schema";
import { getPurchaseUserTag } from "@/app/features/purchases/db/cache/purchases";
import { getReceiptDetails } from "@/app/features/purchases/lib/receiptDetails";
import { getCurrentUser } from "@/app/features/users/actions/currentUser";
import { formatDate, formatPrice } from "@/lib/formatters";
import { cinzel } from "@/components/ui/fonts";
import { PlaqueButton } from "@/components/ui/PlaqueButton";
import { CarvedBackdrop } from "@/components/ui/CarvedBackdrop";

// The receipt for a single purchase, kept here rather than only on Hotmart.
//
// Everything that identifies the sale — what was bought, when, by whom, for how
// much — is drawn from our own records, so the page stands up even when Hotmart
// is unreachable. Hotmart is asked only for what it alone knows: how
// its hosted receipt, and how the final price was reached, which for this site
// usually means a regional discount.
export default function PurchaseReceiptPage({
    params,
}: {
    params: Promise<{ purchaseId: string }>;
}) {
    return (
        <main
            className={`${cinzel.className} relative min-h-screen w-full`}
        >
            <CarvedBackdrop />

            <div className="mx-auto w-full max-w-2xl px-4 pt-32 pb-16">
                {/* The params promise is handed down rather than awaited here.
                    Awaiting it in the shell would make the whole route wait on
                    request-time data before rendering anything at all. */}
                <Suspense fallback={<ReceiptSkeleton />}>
                    <Receipt params={params} />
                </Suspense>
            </div>
        </main>
    );
}

async function Receipt({
    params,
}: {
    params: Promise<{ purchaseId: string }>;
}) {
    const { purchaseId } = await params;
    const { user } = await getCurrentUser({ withFullUser: true });
    if (user == null) redirect("/login");

    const purchase = await getPurchase({ userId: user.id, id: purchaseId });

    // Covers both "no such purchase" and "not yours" in one answer on purpose:
    // a distinct message for the second case would confirm to a stranger that
    // the id belongs to somebody.
    if (purchase == null) return notFound();

    const isRefunded = purchase.refundedAt != null;
    const { pricingRows } = await getReceiptDetails({
        orderId: purchase.orderId,
        pricePaidInCents: purchase.pricePaidInCents,
        isRefunded,
    });

    return (
        <div className="flex flex-col gap-6">
            <Link
                href="/purchases"
                className="text-sm tracking-widest text-ink-meta uppercase hover:text-ink-body"
            >
                ← Mis compras
            </Link>

            <div className="flex flex-wrap items-center justify-between gap-4">
                <h1 className="text-4xl tracking-wide text-ink-bright">
                    {purchase.productDetails.name}
                </h1>

            </div>

            <div className="flex flex-col rounded-2xl border border-gold/30 bg-[#0a1628]/60 backdrop-blur-md">
                <div className="flex items-start justify-between gap-4 p-6">
                    <div className="flex min-w-0 flex-col gap-1">
                        <h2 className="text-xl tracking-wide text-ink-bright">
                            Recibo
                        </h2>
                        <p className="truncate text-sm text-ink-meta">
                            ID: {purchase.id}
                        </p>
                    </div>
                    <span className="shrink-0 rounded-full border border-gold/40 px-3 py-1 text-sm tracking-widest text-ink-body uppercase">
                        {isRefunded ? "Reembolsada" : "Pagada"}
                    </span>
                </div>

                <div className="grid grid-cols-1 gap-6 border-t border-gold/20 p-6 sm:grid-cols-2">
                    <Field label="Fecha" value={formatDate(purchase.createdAt)} />
                    <Field
                        label="Producto"
                        value={purchase.productDetails.name}
                    />
                    <Field label="Cliente" value={user.name} />
                    <Field label="Vendedor" value="Nalu" />
                </div>

                <div className="grid grid-cols-2 gap-x-8 gap-y-3 border-t border-gold/20 p-6">
                    {pricingRows.map(({ label, amountInDollars, isBold }) => (
                        <Fragment key={label}>
                            <span
                                className={
                                    isBold
                                        ? "text-ink-bright"
                                        : "text-ink-body"
                                }
                            >
                                {label}
                            </span>
                            {/* The amounts are gold; their labels beside them
                                stay ink. `isBold` is the total, so it takes the
                                full gold and the rest sit one step back — the
                                same two-step the ink pair used to draw. */}
                            <span
                                className={`justify-self-end ${
                                    isBold ? "text-gold" : "text-gold/75"
                                }`}
                            >
                                {/* `showZeroAsNumber` because on a receipt a
                                    zero is an amount, not the word "Gratis" —
                                    a fully refunded total of $0 is the point
                                    being made. */}
                                {formatPrice(amountInDollars, {
                                    showZeroAsNumber: true,
                                })}
                            </span>
                        </Fragment>
                    ))}
                </div>
            </div>
        </div>
    );
}

function Field({ label, value }: { label: string; value: string }) {
    return (
        <div className="flex flex-col gap-1">
            <span className="text-sm tracking-widest text-ink-meta uppercase">
                {label}
            </span>
            <span className="wrap-break-words text-ink-bright">{value}</span>
        </div>
    );
}

// Tagged per user rather than per purchase, because the user tag is the one both
// `insertPurchase` and `refundPurchase` already expire. A per-id tag would look
// tighter but nothing invalidates it, so a refunded purchase would keep
// presenting itself as paid.
async function getPurchase({ userId, id }: { userId: string; id: string }) {
    "use cache";
    cacheTag(getPurchaseUserTag(userId));

    // Filtered on id AND userId together: `id` comes from the URL, so this
    // pairing is what stops one customer reading another's receipt.
    return db.query.PurchaseTable.findFirst({
        columns: {
            id: true,
            pricePaidInCents: true,
            refundedAt: true,
            productDetails: true,
            createdAt: true,
            orderId: true,
        },
        where: and(eq(PurchaseTable.id, id), eq(PurchaseTable.userId, userId)),
    });
}

function ReceiptSkeleton() {
    return (
        <div className="flex animate-pulse flex-col gap-6">
            <div className="h-4 w-32 rounded bg-gold/10" />
            <div className="h-9 w-72 max-w-full rounded bg-gold/20" />
            <div className="h-80 rounded-2xl border border-gold/20 bg-[#0a1628]/40" />
        </div>
    );
}
