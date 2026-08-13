import { startCheckout } from "../actions/hotmart";
import { PlaqueSubmitButton } from "@/components/ui/PlaqueSubmitButton";

// Sends the buyer to Hotmart's payment page in one click.
//
// A plain <form> with a Server Action, not a client component. The whole job is
// "create a session server-side, then redirect", so this file stays on the
// server and the purchase still completes if the page's JavaScript never loads.
//
// The submit button is the exception, and only just: it is a small client
// component so it can show a spinner while the action runs. It adds no data to
// the submission and no requirement to work — without JavaScript it is an
// ordinary submit button and the sale goes through unchanged.
//
// There used to be a second button here, offering to swap a regional price for
// a discount code. It existed because a Stripe session had exactly one discount
// slot, so the buyer had to choose before leaving. Hotmart's payment page has
// its own coupon field, so that whole either-or disappeared.
//
// The redirect notice lives here rather than at each call site so every button
// carries it. Leaving the site to pay is worth warning about: an unexpected
// jump to another domain mid-purchase is exactly what people are taught to
// treat as suspicious.
export function CheckoutButton({
    productId,
    label = "Comprar ahora",
    // How the button and its notice sit in whatever contains them. Left-aligned
    // under a product description, which is where this started; centred inside
    // the locked-lesson panel, which is centred throughout. The default is the
    // original, so only the caller that differs has to say so.
    className = "flex flex-col items-start gap-2",
    // The plaque's own two sizes. Default everywhere this began — a page's
    // main call to action — and `sm` where it is a secondary offer sharing a
    // row or a card with something else, so it does not outweigh the button it
    // sits beside.
    size = "default",
    // Solid gold by default, because on a product page buying IS the page.
    // `secondary` is for the upgrade offer, which always sits beside a primary
    // "keep reading" button — two gold plaques side by side would leave the
    // reader with no idea which one the page wanted them to press.
    variant = "primary",
    // Whether the button fills its container. The original behaviour is to
    // stretch on a phone and shrink to its label from `sm` up; a card wants it
    // full width at every size, matching the buttons stacked with it.
    fullWidth = false,
    // An extra line between the button and the redirect notice, for callers
    // whose offer needs a reason as well as a price — the upgrade, where the
    // buyer already has the course open and "buy" alone reads as a mistake.
    // Above the notice on purpose: why you would buy comes before how the
    // payment is handled.
    hint,
    // Everything under the button — the hint, the redirect notice, the discount
    // switch — or nothing but the button itself.
    //
    // False only on the "Mis cursos" shelf, where the offer is one line in a
    // card that already carries a category, a title, a size, a description, a
    // progress bar and another button. Three more lines of small print there
    // buries the card's own job. See the call site for what that costs.
    showDetails = true,
}: {
    productId: string;
    label?: string;
    className?: string;
    size?: "default" | "sm";
    variant?: "primary" | "secondary";
    fullWidth?: boolean;
    hint?: string;
    showDetails?: boolean;
}) {
    return (
        <form
            action={startCheckout.bind(null, productId)}
            className={className}
        >
            <PlaqueSubmitButton
                size={size}
                variant={variant}
                className={fullWidth ? "block w-full" : "w-full sm:w-auto"}
            >
                {label}
            </PlaqueSubmitButton>
            {showDetails && (
                <>
                    {hint && <p className="text-sm text-ink-body">{hint}</p>}
                    <p className="text-sm text-ink-meta">
                        Serás redirigido a Hotmart para completar el pago de
                        forma segura.
                    </p>
                </>
            )}
        </form>
    );
}

