import { Suspense } from "react";
import { getUserCoupon } from "@/app/features/countryGroups/lib/getUserCoupon";
import { startCheckout } from "../actions/stripe";
import { productCtaClassName } from "./productCtaStyles";

// Sends the buyer to Stripe's hosted checkout in one click.
//
// A plain <form> with a Server Action, not a client component. The whole job is
// "create a session server-side, then redirect", which needs no browser
// JavaScript at all — so this stays a server component, ships nothing to the
// client, and still works if the page's JavaScript never loads.
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
}: {
    productId: string;
    label?: string;
    className?: string;
}) {
    return (
        <form
            action={startCheckout.bind(null, productId)}
            className={className}
        >
            <button
                type="submit"
                className={productCtaClassName}
            >
                {label}
            </button>
            <p className="text-xs text-yellow-200/50">
                Serás redirigido a Stripe para completar el pago de forma
                segura.
            </p>
            {/* Its own boundary because it reads the buyer's country, which is
                request-time data — the button above must not wait on it. The
                fallback is nothing at all: this is a secondary path, and an
                empty gap that fills in reads better than a placeholder that
                turns out to be for an option this buyer never had. */}
            <Suspense fallback={null}>
                <DiscountCodeSwitch />
            </Suspense>
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
        <div className="mt-2 flex flex-col items-start gap-1 border-t border-yellow-200/15 pt-3">
            <button
                type="submit"
                name="discountMode"
                value="promo"
                className="cursor-pointer text-xs text-yellow-200/70 underline underline-offset-2 transition-colors hover:text-yellow-200"
            >
                ¿Tienes un código de descuento?
            </button>
            {/* Spelling out what they would lose, and by how much. Stripe only
                allows one discount per purchase, so a buyer with a large
                regional discount can easily end up paying MORE by redeeming a
                small code — and they would not find out until the payment page
                showed a higher number. Naming the percentage here is what makes
                this a real choice instead of a trap. */}
            <p className="text-xs text-yellow-200/40">
                Solo se puede usar un descuento por compra: al aplicar un código
                se reemplaza tu precio regional ({percentOff}% de descuento,{" "}
                {coupon.countryGroupName}).
            </p>
        </div>
    );
}
