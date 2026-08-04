"use client";

import { useState, type ComponentProps, type ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { PlaqueButton } from "./PlaqueButton";
import { LoadingTextSwap } from "./LoadingTextSwap";
import { cn } from "@/lib/utils";

// A plaque that submits its form and then shows it is working.
//
// Every control that wears this leaves the site for Stripe, and Stripe's
// session has to be created server-side before there is a URL to leave towards
// — several database queries and a call to Stripe's API. On a deployed server
// that is comfortably a second or two during which a plain <form> does nothing
// at all, because a form with a Server Action is the old-fashioned kind: the
// browser posts and waits, and no JavaScript is running on the page to react.
// The buyer sees a button they pressed and a page that ignored them.
//
// This is the ONLY client component on the checkout path. The forms, the pages
// and the actions all stay on the server, so with JavaScript disabled every
// purchase still completes exactly as before — the spinner is what is lost, not
// the sale.
export function PlaqueSubmitButton({
    children,
    className,
    onClick,
    ...props
}: {
    variant?: "primary" | "secondary";
    size?: "default" | "sm";
    className?: string;
    children: ReactNode;
} & Omit<ComponentProps<"button">, "className" | "children" | "type">) {
    // Reports on the FORM, not on this button — so in a form with more than one
    // submit button it goes true no matter which was pressed.
    const { pending } = useFormStatus();

    // Which is why the button records its own click. Working backwards from the
    // submitted FormData to identify the presser is possible, but it means
    // naming every button and teaching each one what its siblings are called;
    // the button was clicked, so it can simply remember that. Nothing extra is
    // sent to the server and no button needs to know another exists.
    const [clicked, setClicked] = useState(false);

    // Clearing the flag once the form goes idle again — which happens only when
    // an action threw instead of redirecting, since the ordinary ending is that
    // this page is replaced by Stripe's.
    //
    // Adjusting state during render rather than in an effect. React documents
    // this as the way to reset state in response to a value changing, and the
    // compiler's lint rules reject the effect version outright: an effect would
    // paint one frame with the stale flag and then re-render to fix it, while
    // this is caught before anything reaches the screen.
    const [pendingBefore, setPendingBefore] = useState(pending);
    if (pendingBefore !== pending) {
        setPendingBefore(pending);
        if (!pending) setClicked(false);
    }

    const busy = pending && clicked;

    return (
        <PlaqueButton
            type="submit"
            // Every button in the form, not just this one. A second press while
            // the first is in flight would open a second Checkout Session, and
            // on the product page the "discount code" switch is a real second
            // way to do exactly that.
            disabled={pending}
            aria-busy={busy}
            onClick={event => {
                setClicked(true);
                onClick?.(event);
            }}
            className={cn(
                // The shell dims every disabled plaque to half opacity, which is
                // right for the sibling that is merely locked but wrong for this
                // one: the button being waited on is the one thing on the page
                // that should still look alive.
                busy && "disabled:opacity-100",
                className
            )}
            {...props}
        >
            <LoadingTextSwap isLoading={busy}>{children}</LoadingTextSwap>
        </PlaqueButton>
    );
}
