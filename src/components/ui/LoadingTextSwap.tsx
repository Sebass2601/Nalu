import type { ReactNode } from "react";
import { Loader2Icon } from "lucide-react";
import { cn } from "@/lib/utils";

// Swaps a control's label for a spinner without letting the control resize.
//
// Both children are always rendered, stacked in the same single grid cell, and
// only their visibility changes. That is the whole point: removing the label
// would collapse the control to the width of a small circle, and a plaque —
// whose bevelled shape is cut to its own box — would visibly snap narrower and
// then back. Keeping the text in place, merely invisible, holds the width the
// label asked for.
//
// `invisible` rather than `opacity-0` so the hidden copy is also removed from
// the accessibility tree; screen readers should hear one label, not two.
export function LoadingTextSwap({
    isLoading,
    children,
}: {
    isLoading: boolean;
    children: ReactNode;
}) {
    return (
        <span className="grid items-center justify-items-center">
            <span
                className={cn(
                    "col-start-1 row-start-1",
                    isLoading ? "invisible" : "visible"
                )}
            >
                {children}
            </span>
            <span
                className={cn(
                    "col-start-1 row-start-1",
                    isLoading ? "visible" : "invisible"
                )}
            >
                {/* Colour and size both inherit: `currentColor` makes it navy
                    on a primary plaque and white on a secondary one, and sizing
                    in `em` keeps it proportional to whatever label it replaced
                    — a full-size plaque, a small one, or a line of body text. */}
                <Loader2Icon aria-hidden className="size-[1.25em] animate-spin" />
            </span>
        </span>
    );
}
