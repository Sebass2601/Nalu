import { Suspense } from "react";
import { getUserCoupon } from "@/app/features/countryGroups/lib/getUserCoupon";
import { startCheckout } from "../actions/stripe";
import { PlaqueSubmitButton } from "@/components/ui/PlaqueSubmitButton";
import { DiscountCodeSubmit } from "./DiscountCodeSubmit";

// Sends the buyer to Stripe's hosted checkout in one click.
//
// A plain <form> with a Server Action, not a client component. The whole job is
// "create a session server-side, then redirect", so this file stays on the
// server and the purchase still completes if the page's JavaScript never loads.
//
// The two submit buttons are the exception, and only just: each is a small
// client component so it can show a spinner while the session is being created
// (see PlaqueSubmitButton for why that wait is long enough to need one). They
// add no data to the submission and no requirement to work — without
// JavaScript they are ordinary submit buttons and the sale goes through
// unchanged.
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
                        Serás redirigido a Stripe para completar el pago de
                        forma segura.
                    </p>
                    {/* Its own boundary because it reads the buyer's country,
                        which is request-time data — the button above must not
                        wait on it. The fallback is nothing at all: this is a
                        secondary path, and an empty gap that fills in reads
                        better than a placeholder that turns out to be for an
                        option this buyer never had. */}
                    <Suspense fallback={null}>
                        <DiscountCodeSwitch />
                    </Suspense>
                </>
            )}
        </form>
    );
}

// The opt-out from regional pricing, shown only to buyers who actually have a
// regional price to give up.
//
// Everyone else already gets Stripe's code field on the checkout page (see
// `allow_promotion_codes` in the action), so for them there is no choice to
// present and nothing to render.
//
// It is a second submit button in the same form rather than a link or a
// checkbox. A submit button contributes its name/value only when it is the one
// that submitted, which is precisely the "either/or" this needs — and it works
// with no JavaScript, keeping the whole checkout path free of client code.
async function DiscountCodeSwitch() {
    const coupon = await getUserCoupon();
    if (coupon == null) return null;

    const percentOff = Math.round(coupon.discountPercentage * 100);

    return (
        <div className="mt-2 flex flex-col items-start gap-1 border-t border-gold/15 pt-3">
            <DiscountCodeSubmit>
                ¿Tienes un código de descuento?
            </DiscountCodeSubmit>
            {/* Spelling out what they would lose, and by how much. Stripe only
                allows one discount per purchase, so a buyer with a large
                regional discount can easily end up paying MORE by redeeming a
                small code — and they would not find out until the payment page
                showed a higher number. Naming the percentage here is what makes
                this a real choice instead of a trap. */}
            <p className="text-sm text-ink-faint">
                Solo se puede usar un descuento por compra: al aplicar un código
                se reemplaza tu precio regional ({percentOff}% de descuento,{" "}
                {coupon.countryGroupName}).
            </p>
        </div>
    );
}
