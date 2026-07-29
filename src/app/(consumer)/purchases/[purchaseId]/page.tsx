import { Fragment, Suspense } from "react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { cacheTag } from "next/cache";
import type Stripe from "stripe";
import { db } from "@/drizzle/db";
import { PurchaseTable } from "@/drizzle/schema";
import { getPurchaseUserTag } from "@/app/features/purchases/db/cache/purchases";
import { getCurrentUser } from "@/app/features/users/actions/currentUser";
import { formatDate, formatPrice } from "@/lib/formatters";
import { stripe } from "@/lib/stripe";
import { cinzel } from "@/components/ui/fonts";

// The receipt for a single purchase, kept here rather than only on Stripe.
//
// Everything that identifies the sale — what was bought, when, by whom, for how
// much — is drawn from our own records, so the page stands up even when Stripe
// is unreachable. Stripe is asked for the two things only it knows: the URL of
// its hosted receipt, and how the final price was reached, which for this site
// usually means a regional discount.
export default function PurchaseReceiptPage({
    params,
}: {
    params: Promise<{ purchaseId: string }>;
}) {
    return (
        <main
            className={`${cinzel.className} min-h-screen w-full bg-[#0a1628] bg-linear-to-b from-[#12243f] via-[#0d1c31] to-[#0a1628]`}
        >
            <div className="mx-auto w-full max-w-2xl px-4 pt-28 pb-16">
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
    const { receiptUrl, pricingRows } = await getStripeDetails({
        stripeSessionId: purchase.stripeSessionId,
        pricePaidInCents: purchase.pricePaidInCents,
        isRefunded,
    });

    return (
        <div className="flex flex-col gap-6">
            <Link
                href="/purchases"
                className="text-xs tracking-widest text-yellow-200/50 uppercase hover:text-yellow-200/80"
            >
                ← Mis compras
            </Link>

            <div className="flex flex-wrap items-center justify-between gap-4">
                <h1 className="text-3xl tracking-wide text-yellow-100">
                    {purchase.productDetails.name}
                </h1>

                {/* Only when Stripe handed one back. A row with no hosted
                    receipt still has a perfectly good local one below. */}
                {receiptUrl && (
                    <Link
                        href={receiptUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded-lg border border-yellow-200/60 px-5 py-2 text-xs tracking-widest text-yellow-200 uppercase transition-colors hover:bg-yellow-200 hover:text-[#0a1628]"
                    >
                        Ver recibo de Stripe
                    </Link>
                )}
            </div>

            <div className="flex flex-col rounded-2xl border border-yellow-200/30 bg-[#0a1628]/60 backdrop-blur-md">
                <div className="flex items-start justify-between gap-4 p-6">
                    <div className="flex min-w-0 flex-col gap-1">
                        <h2 className="text-lg tracking-wide text-yellow-100">
                            Recibo
                        </h2>
                        <p className="truncate text-xs text-yellow-200/50">
                            ID: {purchase.id}
                        </p>
                    </div>
                    <span className="shrink-0 rounded-full border border-yellow-200/40 px-3 py-1 text-xs tracking-widest text-yellow-200/80 uppercase">
                        {isRefunded ? "Reembolsada" : "Pagada"}
                    </span>
                </div>

                <div className="grid grid-cols-1 gap-6 border-t border-yellow-200/20 p-6 sm:grid-cols-2">
                    <Field label="Fecha" value={formatDate(purchase.createdAt)} />
                    <Field
                        label="Producto"
                        value={purchase.productDetails.name}
                    />
                    <Field label="Cliente" value={user.name} />
                    <Field label="Vendedor" value="Nalu" />
                </div>

                <div className="grid grid-cols-2 gap-x-8 gap-y-3 border-t border-yellow-200/20 p-6">
                    {pricingRows.map(({ label, amountInDollars, isBold }) => (
                        <Fragment key={label}>
                            <span
                                className={
                                    isBold
                                        ? "text-yellow-100"
                                        : "text-yellow-200/70"
                                }
                            >
                                {label}
                            </span>
                            <span
                                className={`justify-self-end ${
                                    isBold
                                        ? "text-yellow-100"
                                        : "text-yellow-200/70"
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
            <span className="text-xs tracking-widest text-yellow-200/50 uppercase">
                {label}
            </span>
            <span className="break-words text-yellow-100">{value}</span>
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
            stripeSessionId: true,
        },
        where: and(eq(PurchaseTable.id, id), eq(PurchaseTable.userId, userId)),
    });
}

type PricingRow = {
    label: string;
    amountInDollars: number;
    isBold?: boolean;
};

// Asks Stripe for the hosted receipt and the discount breakdown behind the
// price.
//
// Deliberately not cached: a receipt URL is worth fetching fresh, and this runs
// only when somebody opens one specific purchase.
async function getStripeDetails({
    stripeSessionId,
    pricePaidInCents,
    isRefunded,
}: {
    stripeSessionId: string;
    pricePaidInCents: number;
    isRefunded: boolean;
}): Promise<{ receiptUrl?: string; pricingRows: PricingRow[] }> {
    try {
        const { payment_intent, total_details, amount_total, amount_subtotal } =
            await stripe.checkout.sessions.retrieve(stripeSessionId, {
                expand: [
                    "payment_intent.latest_charge",
                    "total_details.breakdown.discounts",
                ],
            });

        const charge = getLatestCharge(payment_intent);

        // Stripe's own figure when the expansion produced a charge, since a
        // partial refund is a number only it knows. Falling back to the full
        // price otherwise, because at that point all we know is the flag on our
        // own row.
        const refundAmount =
            charge?.amount_refunded ??
            (isRefunded ? pricePaidInCents : undefined);

        return {
            receiptUrl: charge?.receipt_url ?? undefined,
            pricingRows: getPricingRows(await getDiscountRows(total_details), {
                total: (amount_total ?? pricePaidInCents) - (refundAmount ?? 0),
                subtotal: amount_subtotal ?? pricePaidInCents,
                refund: refundAmount,
            }),
        };
    } catch {
        // Stripe unreachable, or a session too old to retrieve. The local
        // receipt is the point of this page, so it still renders in full — just
        // without the hosted link and without the discount breakdown, neither of
        // which we hold ourselves.
        return {
            pricingRows: getPricingRows([], {
                total: isRefunded ? 0 : pricePaidInCents,
                subtotal: pricePaidInCents,
                refund: isRefunded ? pricePaidInCents : undefined,
            }),
        };
    }
}

function getLatestCharge(
    paymentIntent: Stripe.PaymentIntent | string | null
): Stripe.Charge | undefined {
    // A bare string means the expansion did not happen, so there is no charge
    // object to read here.
    if (paymentIntent == null || typeof paymentIntent === "string") return;

    const charge = paymentIntent.latest_charge;
    if (charge == null || typeof charge === "string") return;

    return charge;
}

// One row per discount applied to the sale, named after the coupon behind it.
async function getDiscountRows(
    totalDetails: Stripe.Checkout.Session.TotalDetails | null
): Promise<PricingRow[]> {
    const discounts = totalDetails?.breakdown?.discounts ?? [];

    return Promise.all(
        discounts.map(async ({ amount, discount }) => {
            const coupon = await resolveCoupon(discount.source.coupon);

            return {
                // Regional coupons are already named for their own rate — "PPP
                // 30%" — so the name alone reads correctly. The percentage is
                // spelled out only for a coupon that arrived without a name,
                // and the generic word covers one with neither.
                label:
                    coupon?.name ??
                    (coupon?.percent_off != null
                        ? `${coupon.percent_off}% de descuento`
                        : "Descuento"),
                amountInDollars: amount / -100,
            };
        })
    );
}

// The coupon behind a discount arrives as a bare id.
//
// It cannot be expanded in the session call above: the path would be
// `total_details.breakdown.discounts.discount.source.coupon`, well past the four
// levels Stripe allows. So it is fetched separately, and only when a discount
// actually exists.
//
// A failure here costs the row its name, not the row itself — the amount is the
// substantive part of a discount line, and it comes from the session.
async function resolveCoupon(coupon: string | Stripe.Coupon | null) {
    if (coupon == null) return null;
    if (typeof coupon !== "string") return coupon;

    try {
        return await stripe.coupons.retrieve(coupon);
    } catch {
        return null;
    }
}

// A plain total when nothing happened to the price, and a subtotal / discount /
// refund / total breakdown when something did. Showing "Subtotal" and "Total"
// as identical lines on an undiscounted purchase would just be noise.
function getPricingRows(
    discountRows: PricingRow[],
    {
        total,
        subtotal,
        refund,
    }: { total: number; subtotal: number; refund?: number }
): PricingRow[] {
    const adjustments = [...discountRows];

    if (refund) {
        adjustments.push({
            label: "Reembolso",
            amountInDollars: refund / -100,
        });
    }

    if (adjustments.length === 0) {
        return [{ label: "Total", amountInDollars: total / 100, isBold: true }];
    }

    return [
        { label: "Subtotal", amountInDollars: subtotal / 100 },
        ...adjustments,
        { label: "Total", amountInDollars: total / 100, isBold: true },
    ];
}

function ReceiptSkeleton() {
    return (
        <div className="flex animate-pulse flex-col gap-6">
            <div className="h-4 w-32 rounded bg-yellow-200/10" />
            <div className="h-9 w-72 max-w-full rounded bg-yellow-200/20" />
            <div className="h-80 rounded-2xl border border-yellow-200/20 bg-[#0a1628]/40" />
        </div>
    );
}
