"use server";

import { eq } from "drizzle-orm";
import { db } from "@/drizzle/db";
import { PurchaseTable } from "@/drizzle/schema";
import { HotmartApiError } from "@/lib/hotmart";
import { refundHotmartSale } from "@/lib/hotmartApi";
import { getCurrentUser } from "@/app/features/users/actions/currentUser";
import { revokeUserCourseAccess } from "@/app/features/courses/db/userCourseAccess";
import { canRefundPurchases } from "../permissions/purchases";
import { refundPurchase as markPurchaseRefunded } from "../db/purchases";
import { revalidatePurchaseCache } from "../db/cache/purchases";

// Sends money back to a customer, then reverses everything the payment bought.
//
// Three systems have to end up agreeing: Hotmart (where the money is), the
// purchases table (where the receipt is), and the course access table (where
// the entitlement is). This action drives all three in that order, because it
// is the only order that fails safely — if it dies partway, the worst outcome
// is a refunded customer who briefly keeps access, which is recoverable. The
// reverse order would revoke access from someone whose money never came back.
//
// Note that the PURCHASE_REFUNDED webhook does the last two steps as well, and
// will fire for this refund a moment after Hotmart accepts it. That is not a
// duplicate to be avoided — it is the safety net. Doing the work here too is
// what lets the admin see the row flip to "Reembolsada" immediately instead of
// staring at a stale page waiting for a webhook. Both paths are idempotent, so
// whichever arrives second changes nothing.
export async function refundPurchase(id: string) {
    // The role comes from the database via `getCurrentUser`, not from the JWT,
    // so an admin who was demoted a second ago cannot still refund. Server
    // Actions are ordinary HTTP endpoints — anyone who finds the endpoint can
    // call it with any id, so this check is the real gate, not the fact that
    // the button only renders on an admin page.
    if (!canRefundPurchases(await getCurrentUser())) {
        return {
            error: true,
            message: "No tienes permiso para emitir reembolsos.",
        };
    }

    const purchase = await db.query.PurchaseTable.findFirst({
        columns: {
            id: true,
            pricePaidInCents: true,
            refundedAt: true,
            orderId: true,
        },
        where: eq(PurchaseTable.id, id),
    });

    if (purchase == null) {
        return { error: true, message: "No encontramos esta compra." };
    }

    if (purchase.refundedAt != null) {
        return { error: true, message: "Esta compra ya estaba reembolsada." };
    }

    // Hotmart rejects a refund of nothing, and a free purchase has no money to
    // return anyway. The button is hidden in this case too; this is the guard
    // that holds when the request does not come from the button.
    if (purchase.pricePaidInCents === 0) {
        return {
            error: true,
            message: "Esta compra fue gratuita, no hay nada que reembolsar.",
        };
    }

    // Pulled into its own constant so the null check narrows it for the closure
    // below — TypeScript drops that narrowing on object properties once they
    // are read inside a callback.
    const orderId = purchase.orderId;

    const hotmartResult = await createHotmartRefund(purchase.id, orderId);

    if (hotmartResult.error) return hotmartResult;

    // Only reached once the money is genuinely on its way back.
    await db.transaction(async trx => {
        // Order matters, exactly as in the webhook. `markPurchaseRefunded`
        // stamps `refundedAt` first so `revokeUserCourseAccess` stops counting
        // this purchase as a reason to keep the courses it paid for. Reversed,
        // nothing would be revoked.
        const refunded = await markPurchaseRefunded(orderId, trx);

        // Undefined means the webhook beat us to it. The money still moved and
        // the row is already correct, so there is nothing left to undo.
        if (refunded == null) return;

        await revokeUserCourseAccess(
            { userId: refunded.userId, productId: refunded.productId },
            trx
        );

        // Re-invalidated here with the Server Action flavour. The write above
        // already expired these tags, but only `updateTag` makes the re-render
        // that follows this action wait for fresh data — which is what turns
        // the row's badge to "Reembolsada" on the very next paint.
        revalidatePurchaseCache(refunded.userId);
    });

    return { error: false, message: hotmartResult.message };
}

// Asks Hotmart for the refund and turns anything that goes wrong into a
// sentence an admin can act on.
//
// Hotmart refuses a refund unless the sale is Approved or Completed, is not in
// a trial, and was not paid by BACS or SEPA — those two the buyer must reclaim
// through their own bank. There is no idempotency key to send, unlike Stripe:
// the guard against a double refund is the `refundedAt` check above plus
// Hotmart's own rejection of a sale it has already refunded.
async function createHotmartRefund(purchaseId: string, orderId: string) {
    try {
        await refundHotmartSale(orderId);

        return {
            error: false,
            message:
                "Reembolso emitido. Hotmart avisará al cliente y el acceso al curso ha sido revocado.",
        };
    } catch (error) {
        // Already refunded on Hotmart's side — almost always because somebody
        // did it from Hotmart's dashboard and the webhook never arrived to tell
        // us. The money is where it should be and only our own records are
        // behind, so this is treated as success and the caller goes on to bring
        // them up to date.
        //
        // Matched on the status rather than a message, because Hotmart's error
        // text is not a stable interface. 409 is what it answers for a sale
        // whose state does not allow the operation.
        if (error instanceof HotmartApiError && error.status === 409) {
            return {
                error: false,
                message:
                    "Este pago ya estaba reembolsado en Hotmart. Hemos actualizado el registro y revocado el acceso.",
            };
        }

        // Everything else: a sale outside the refund window, a payment method
        // Hotmart cannot reverse, Hotmart unreachable. The full error goes to
        // the server log; the admin gets the short version, because nothing was
        // changed on our side and the useful next step is Hotmart's panel.
        console.error(
            `[hotmart] refund failed for purchase ${purchaseId}:`,
            error
        );

        return {
            error: true,
            message:
                "Hotmart no pudo procesar el reembolso. Revisa la venta en el panel de Hotmart.",
        };
    }
}
