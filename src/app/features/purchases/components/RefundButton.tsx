import { ActionButton } from "@/components/ActionButton";
import { refundPurchase } from "../actions/purchases";

// Issues a real refund through Stripe. Shared by the sales table and the
// receipt page so both spell the consequence the same way.
//
// `requireAreYouSure` is not decoration here. Every other confirm dialog in the
// admin guards a record; this one guards money leaving the account, and a
// refund cannot be undone — there is no "un-refund" in Stripe, only charging
// the customer again.
//
// `ActionButton` handles the rest of the conversation with the admin: it
// disables itself and shows a spinner while Stripe is working, then raises a
// toast carrying whatever sentence the action returned — the confirmation, or
// the reason it did not happen.
export function RefundButton({ purchaseId }: { purchaseId: string }) {
    return (
        <ActionButton
            variant="destructiveOutline"
            requireAreYouSure
            // `bind` produces a server action already carrying this id, so the
            // browser never gets to choose which purchase is refunded — it can
            // only invoke the one this button was rendered for.
            action={refundPurchase.bind(null, purchaseId)}
        >
            Reembolsar
        </ActionButton>
    );
}
