"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import { LoadingTextSwap } from "@/components/ui/LoadingTextSwap";
import { cn } from "@/lib/utils";

// The discount-code switch, with the same pending treatment as the plaque above
// it.
//
// It is easy to read this as a link that opens something, but it is a second
// submit button on the same form: pressing it creates a Checkout Session too,
// and waits exactly as long. Left plain it would be the one control on the page
// that still looked idle while the browser was busy.
//
// Split out from CheckoutButton because that file is a server component and
// this needs a hook. Its markup — the name/value pair that tells the action
// which discount the buyer chose — is unchanged.
export function DiscountCodeSubmit({ children }: { children: React.ReactNode }) {
    const { pending } = useFormStatus();
    const [clicked, setClicked] = useState(false);

    // Same click-flag and same idle reset as PlaqueSubmitButton; see there for
    // why the state is adjusted during render rather than in an effect.
    const [pendingBefore, setPendingBefore] = useState(pending);
    if (pendingBefore !== pending) {
        setPendingBefore(pending);
        if (!pending) setClicked(false);
    }

    const busy = pending && clicked;

    return (
        <button
            type="submit"
            name="discountMode"
            value="promo"
            disabled={pending}
            aria-busy={busy}
            onClick={() => setClicked(true)}
            className={cn(
                "cursor-pointer text-sm text-ink-body underline underline-offset-2 transition-colors hover:text-ink",
                // Locked while the buy button above is working, and visibly so
                // — but never faded when it is the one being waited on.
                "disabled:pointer-events-none disabled:opacity-50",
                busy && "disabled:opacity-100"
            )}
        >
            <LoadingTextSwap isLoading={busy}>{children}</LoadingTextSwap>
        </button>
    );
}
