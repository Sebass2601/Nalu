import { Fragment, Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardAction,
    CardContent,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { PageHeader } from "@/components/PageHeader";
import { RefundButton } from "@/app/features/purchases/components/RefundButton";
import { getAdminPurchase } from "@/app/features/purchases/db/adminPurchases";
import { getReceiptDetails } from "@/app/features/purchases/lib/receiptDetails";
import { requireAdmin } from "@/app/features/users/actions/currentUser";
import { formatDate, formatPrice } from "@/lib/formatters";

// The shop's copy of a single receipt.
//
// It shows the same sale as the buyer's own receipt at /purchases/[purchaseId]
// and gets its numbers from the same place, so the two can never quote
// different totals for one payment. What differs is who it is for: this one
// names the customer instead of assuming it is you, and it is reachable for any
// purchase in the shop rather than only your own.
export default function AdminPurchaseReceiptPage({
    params,
}: {
    params: Promise<{ purchaseId: string }>;
}) {
    return (
        <div className="min-h-[calc(100vh-5rem)] bg-white text-gray-900">
            <div className="container mx-auto max-w-3xl px-6 py-6">
                {/* The params promise is handed down rather than awaited here.
                    Awaiting it in the shell would make the whole route wait on
                    request-time data before rendering anything at all — and
                    this page also waits on a Stripe round-trip, which is
                    exactly the kind of delay worth streaming around. */}
                <Suspense fallback={<ReceiptSkeleton />}>
                    <Receipt params={params} />
                </Suspense>
            </div>
        </div>
    );
}

async function Receipt({
    params,
}: {
    params: Promise<{ purchaseId: string }>;
}) {
    // The gate for this page. The layout's check does not rerun on client
    // navigation, and everything below is somebody else's payment data.
    await requireAdmin();

    const { purchaseId } = await params;
    const purchase = await getAdminPurchase(purchaseId);

    if (purchase == null) return notFound();

    const isRefunded = purchase.refundedAt != null;
    const { receiptUrl, pricingRows } = await getReceiptDetails({
        stripeSessionId: purchase.stripeSessionId,
        pricePaidInCents: purchase.pricePaidInCents,
        isRefunded,
    });

    return (
        <>
            <Link
                href="/admin/purchases"
                className="text-sm text-muted-foreground hover:text-foreground"
            >
                ← Ventas
            </Link>

            <PageHeader title={purchase.productDetails.name} className="mt-4">
                <div className="flex gap-2">
                    {/* Only when Stripe handed one back. A row with no hosted
                        receipt still has a perfectly good local one below. */}
                    {receiptUrl && (
                        <Button variant="outline" asChild>
                            <Link
                                href={receiptUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                            >
                                Ver recibo de Stripe
                            </Link>
                        </Button>
                    )}

                    {/* Same guard as the sales table: nothing to reverse on an
                        already-refunded sale or a free one. */}
                    {!isRefunded && purchase.pricePaidInCents > 0 && (
                        <RefundButton purchaseId={purchase.id} />
                    )}
                </div>
            </PageHeader>

            <Card>
                <CardHeader className="border-b">
                    <CardTitle>Recibo</CardTitle>
                    <div className="text-sm text-muted-foreground">
                        ID: {purchase.id}
                    </div>
                    <CardAction>
                        {isRefunded ? (
                            <Badge variant="destructive">Reembolsada</Badge>
                        ) : (
                            <Badge variant="secondary">Pagada</Badge>
                        )}
                    </CardAction>
                </CardHeader>

                <CardContent className="grid grid-cols-1 gap-6 border-b pb-(--card-spacing) sm:grid-cols-2">
                    <Field label="Fecha" value={formatDate(purchase.createdAt)} />
                    <Field
                        label="Producto"
                        value={purchase.productDetails.name}
                    />
                    <Field label="Cliente" value={purchase.user.name} />
                    <Field label="Email" value={purchase.user.email} />
                </CardContent>

                <CardContent className="grid grid-cols-2 gap-x-8 gap-y-3">
                    {pricingRows.map(({ label, amountInDollars, isBold }) => (
                        <Fragment key={label}>
                            <span
                                className={
                                    isBold ? "font-bold" : "text-muted-foreground"
                                }
                            >
                                {label}
                            </span>
                            <span
                                className={`justify-self-end ${
                                    isBold ? "font-bold" : "text-muted-foreground"
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
                </CardContent>
            </Card>
        </>
    );
}

function Field({ label, value }: { label: string; value: string }) {
    return (
        <div className="flex flex-col gap-1">
            <span className="text-xs uppercase tracking-wide text-muted-foreground">
                {label}
            </span>
            <span className="wrap-break-words">{value}</span>
        </div>
    );
}

function ReceiptSkeleton() {
    return (
        <div className="flex animate-pulse flex-col gap-6">
            <div className="h-4 w-24 rounded bg-muted" />
            <div className="h-8 w-72 max-w-full rounded bg-muted" />
            <div className="h-80 rounded-xl bg-muted" />
        </div>
    );
}
