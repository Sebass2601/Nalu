import Image from "next/image";
import { formatDate, formatPrice } from "@/lib/formatters";
import type { UserPurchase } from "../db/userPurchases";
import { PlaqueButton } from "@/components/ui/PlaqueButton";

// One line of the purchase history.
//
// A row rather than a card: what people come to this page for is scanning dates
// and amounts down a column, and the image-led cards used elsewhere push those
// apart. The thumbnail is here to identify the row at a glance, not to sell
// anything — it has already been sold.
export function PurchaseRow({ purchase }: { purchase: UserPurchase }) {
    const isRefunded = purchase.refundedAt != null;

    return (
        <li
            className={`flex flex-col gap-4 rounded-2xl border border-yellow-200/30 bg-[#0a1628]/70 p-4 backdrop-blur-md sm:flex-row sm:items-center sm:gap-5 ${
                // Dimmed, but still legible and still readable by a screen
                // reader. A refund is a real event in this history, so it is
                // pushed back rather than taken away.
                isRefunded ? "opacity-60" : ""
            }`}
        >
            <div className="relative aspect-video w-full shrink-0 overflow-hidden rounded-lg bg-[#0a1628] sm:w-32">
                <Image
                    src={purchase.productImageUrl}
                    alt=""
                    fill
                    sizes="(min-width: 640px) 8rem, 100vw"
                    className="object-cover"
                />
            </div>

            <div className="flex min-w-0 flex-1 flex-col gap-1">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <h2 className="text-xl tracking-wide text-gold-bright">
                        {purchase.productName}
                    </h2>
                    {isRefunded && <RefundedBadge />}
                </div>
                <p className="text-sm tracking-widest text-gold-meta uppercase">
                    {formatDate(purchase.purchasedAt)}
                </p>
                <p className="text-gold">
                    {formatPrice(purchase.pricePaidInCents / 100)}
                </p>
            </div>

            <div className="flex flex-wrap gap-2 sm:flex-col sm:items-stretch">
                {/* A refund revoked the access this link depends on, so the
                    course button disappears rather than leading to a page that
                    turns them away. */}
                {!isRefunded && <CourseLink courseId={purchase.courseId} />}

                {/* Present on every row, refunded ones included: a refund is
                    exactly the event someone wants the paperwork for. */}
                <ReceiptLink purchaseId={purchase.id} />
            </div>
        </li>
    );
}

// Points at the course itself when the product unlocked exactly one, and at the
// shelf when it bundled several — where the wording turns plural so the button
// promises only what it delivers.
function CourseLink({ courseId }: { courseId: string | null }) {
    return (
        <PlaqueButton
            href={courseId == null ? "/courses" : `/courses/${courseId}`}
            className="block w-full"
            size="sm"
        >
            {courseId == null ? "Ver cursos" : "Ver curso"}
        </PlaqueButton>
    );
}

// Leads to our own receipt page rather than straight out to Stripe. The receipt
// is built from what we recorded at the moment of sale, so it renders even when
// Stripe is unreachable, and it carries the link to Stripe's hosted copy for
// anyone who wants the original.
function ReceiptLink({ purchaseId }: { purchaseId: string }) {
    return (
        <PlaqueButton
            href={`/purchases/${purchaseId}`}
            className="block w-full"
            size="sm"
            variant="secondary"
        >
            Ver recibo
        </PlaqueButton>
    );
}

function RefundedBadge() {
    return (
        <span className="rounded-full border border-yellow-200/40 px-2 py-0.5 text-xs tracking-widest text-gold-body uppercase">
            Reembolsada
        </span>
    );
}

