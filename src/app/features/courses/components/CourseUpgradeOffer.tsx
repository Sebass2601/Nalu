import { getCurrentUser } from "@/app/features/users/actions/currentUser";
import { CheckoutButton } from "@/app/features/purchases/components/CheckoutButton";
import { cn } from "@/lib/utils";
import { getCourseUpgradeOffer } from "../lib/courseUpgrade";

// "This course is yours while you subscribe — keep it for good."
//
// Only ever shown to a subscriber reading a course they do not own, and only
// while something is actually selling it. `getCourseUpgradeOffer` decides all
// of that; see the comment there for why each clause is needed.
//
// It goes straight to Stripe for the cheapest product bundling this course,
// which is deliberately the same route a locked lesson offers. The question
// being answered is identical — "what does it cost to own this" — so the two
// must not resolve to different products or a buyer would see one price on the
// lock screen and another here.

// The line that has to be said, wherever this appears. Someone looking at this
// button already has the course open, so "buy" on its own reads as a mistake —
// the sentence below is the entire reason the button is not one.
const HINT = "Consérvalo para siempre, aunque canceles la suscripción.";

const LABEL = "Comprar de por vida";

// Resolves the offer itself, for callers that have a course id and nothing
// else. Renders nothing when there is no offer to make, so it can be dropped in
// unconditionally.
export async function CourseUpgradeOffer({
    courseId,
    className,
    size,
}: {
    courseId: string;
    className?: string;
    size?: "default" | "sm";
}) {
    const { userId } = await getCurrentUser();
    const product = await getCourseUpgradeOffer({ userId, courseId });

    if (product == null) return null;

    return (
        <CourseUpgradeButton
            productId={product.id}
            className={className}
            size={size}
        />
    );
}

// The offer once the product is already known — the shelf resolves one per card
// in a single pass, so those cards would be paying for a lookup they have
// already done.
//
// The button comes first and the copy hangs under it. That ordering is what
// lets this sit in a row beside "Continuar" with the two plaques level: with
// the reason written above the button instead, aligning the row by either edge
// would line the other button up with a line of text.
export function CourseUpgradeButton({
    productId,
    className,
    size = "default",
    fullWidth = false,
    showDetails = true,
}: {
    productId: string;
    className?: string;
    size?: "default" | "sm";
    fullWidth?: boolean;
    showDetails?: boolean;
}) {
    return (
        <CheckoutButton
            productId={productId}
            label={LABEL}
            hint={HINT}
            size={size}
            variant="secondary"
            fullWidth={fullWidth}
            showDetails={showDetails}
            className={cn("flex flex-col items-start gap-2", className)}
        />
    );
}
