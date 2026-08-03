import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/app/features/users/actions/currentUser";
import { hasActiveSubscription } from "@/app/features/subscriptions/db/subscriptions";
import { getSubscriptionPlans } from "@/app/features/subscriptions/lib/plans";
import { getUserCoupon } from "@/app/features/countryGroups/lib/getUserCoupon";
import { getDiscountedPriceInDollars } from "@/app/features/products/lib/ppp";
import { startSubscriptionCheckout } from "@/app/features/subscriptions/actions/subscriptions";
import { formatPrice } from "@/lib/formatters";
import { cinzel } from "@/components/ui/fonts";
import {
    SubscriptionCourseRows,
    SubscriptionCourseRowsSkeleton,
} from "@/app/features/courses/components/SubscriptionCourseRows";
import { PlaqueButton } from "@/components/ui/PlaqueButton";

// The subscription offer: both billing intervals side by side, plus the actual
// list of courses it unlocks.
export default function SubscribePage() {
    return (
        <main
            className={`${cinzel.className} min-h-screen w-full bg-[#0a1628] bg-linear-to-b from-[#12243f] via-[#0d1c31] to-[#0a1628]`}
        >
            <div className="mx-auto w-full max-w-4xl px-4 pt-28 pb-8 sm:pt-32">
                <div className="flex flex-col items-center gap-3 text-center">
                    <p className="text-sm tracking-[0.3em] text-gold-body uppercase">
                        Suscripción
                    </p>
                    <h1 className="text-5xl tracking-wide text-gold-bright">
                        Acceso a toda la biblioteca
                    </h1>
                    <p className="max-w-xl text-gold-body">
                        Un solo pago recurrente para entrar a los cursos
                        incluidos. Cancela cuando quieras.
                    </p>
                </div>

                <Suspense fallback={<PlansSkeleton />}>
                    <Plans />
                </Suspense>
            </div>

            {/* The same rows the subscriber sees, shown here as the contents of
                the offer. Grouped and illustrated, where this used to be a
                flat list of names. */}
            <div className="mx-auto w-full max-w-6xl px-4 pb-16">
                <Suspense fallback={<SubscriptionCourseRowsSkeleton />}>
                    <SubscriptionCourseRows emptyMessage="Aún no hay cursos incluidos en la suscripción." />
                </Suspense>

                <p className="mt-12 text-center text-sm text-gold-faint">
                    <Link
                        href="/products"
                        className="underline hover:text-gold-body"
                    >
                        Ver también los cursos disponibles para compra
                        individual
                    </Link>
                </p>
            </div>
        </main>
    );
}

async function Plans() {
    // Someone who already subscribes has nothing to buy here.
    const { user } = await getCurrentUser();
    if (user != null && (await hasActiveSubscription(user.id))) {
        redirect("/subscription");
    }

    // The same coupon `startSubscriptionCheckout` puts on the session, read
    // here so the page advertises the price Stripe will actually ask for.
    // Without this the page quoted the list price and checkout then charged
    // less — the discount appearing from nowhere on the payment screen.
    const [plans, coupon] = await Promise.all([
        getSubscriptionPlans(),
        getUserCoupon(),
    ]);

    // The annual saving compares the yearly plan against twelve monthly
    // payments. A PPP coupon scales both sides by the same percentage, so the
    // ratio between them is unchanged and this figure stays correct discounted
    // or not.
    const equivalentMonthly = applyCoupon(
        Math.round(plans.yearly.equivalentMonthlyInDollars),
        coupon
    );

    return (
        <div className="mt-12 grid gap-6 sm:grid-cols-2">
            <PlanCard
                interval="month"
                title="Mensual"
                priceInDollars={plans.monthly.priceInDollars}
                coupon={coupon}
                caption="por mes"
            />
            <PlanCard
                interval="year"
                title="Anual"
                priceInDollars={plans.yearly.priceInDollars}
                coupon={coupon}
                caption={`por año · equivale a ${formatPrice(
                    equivalentMonthly
                )}/mes`}
                badge={
                    plans.yearly.savingsPercent > 0
                        ? `Ahorra ${plans.yearly.savingsPercent}%`
                        : undefined
                }
                highlighted
            />
        </div>
    );
}

// Null coupon means no discount, so the price passes through untouched.
function applyCoupon(
    priceInDollars: number,
    coupon: Awaited<ReturnType<typeof getUserCoupon>>
) {
    if (coupon == null) return priceInDollars;
    return getDiscountedPriceInDollars(priceInDollars, coupon.discountPercentage);
}

function PlanCard({
    interval,
    title,
    priceInDollars,
    coupon,
    caption,
    badge,
    highlighted = false,
}: {
    interval: "month" | "year";
    title: string;
    priceInDollars: number;
    coupon: Awaited<ReturnType<typeof getUserCoupon>>;
    caption: string;
    badge?: string;
    highlighted?: boolean;
}) {
    // Takes the list price and the coupon rather than a pre-formatted string,
    // so the discount is computed in exactly one place and the struck-through
    // original stays available to show beside it.
    const discounted = applyCoupon(priceInDollars, coupon);

    return (
        <div
            className={`flex flex-col gap-4 rounded-2xl border p-6 ${
                highlighted
                    ? "border-yellow-200/60 bg-[#0a1628]/80"
                    : "border-yellow-200/25 bg-[#0a1628]/50"
            }`}
        >
            <div className="flex items-center justify-between gap-3">
                <h2 className="text-2xl tracking-wide text-gold-bright">
                    {title}
                </h2>
                {badge && (
                    <span className="rounded border border-yellow-200/50 px-2 py-0.5 text-xs tracking-widest text-gold uppercase">
                        {badge}
                    </span>
                )}
            </div>

            <div className="flex flex-col gap-1">
                <div className="flex items-baseline gap-2">
                    <span className="text-4xl font-semibold text-gold">
                        {formatPrice(discounted)}
                    </span>
                    {/* Only when it differs — a coupon that rounds to the same
                        whole dollar would otherwise print the identical figure
                        struck through beside itself. */}
                    {discounted !== priceInDollars && (
                        <span className="text-base text-gold-meta line-through">
                            {formatPrice(priceInDollars)}
                        </span>
                    )}
                </div>
                <span className="text-sm text-gold-meta">{caption}</span>
            </div>

            {/* A plain form + Server Action: no client JavaScript needed to
                start a checkout, so this works before hydration. */}
            <form
                action={startSubscriptionCheckout.bind(null, interval)}
                className="flex justify-center"
            >
                <PlaqueButton type="submit">Suscribirme</PlaqueButton>
            </form>
        </div>
    );
}

function PlansSkeleton() {
    return (
        <div className="mt-12 grid animate-pulse gap-6 sm:grid-cols-2">
            <div className="h-56 rounded-2xl bg-[#0a1628]/40" />
            <div className="h-56 rounded-2xl bg-[#0a1628]/40" />
        </div>
    );
}
