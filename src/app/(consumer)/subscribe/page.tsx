import { Suspense } from "react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/app/features/users/actions/currentUser";
import { hasActiveSubscription } from "@/app/features/subscriptions/db/subscriptions";
import { getSubscriptionPlans } from "@/app/features/subscriptions/lib/plans";
import { startSubscriptionCheckout } from "@/app/features/subscriptions/actions/subscriptions";
import { formatPrice } from "@/lib/formatters";
import { cinzel } from "@/components/ui/fonts";
import {
    SubscriptionCourseRows,
    SubscriptionCourseRowsSkeleton,
} from "@/app/features/courses/components/SubscriptionCourseRows";
import { PlaqueSubmitButton } from "@/components/ui/PlaqueSubmitButton";

// The subscription offer: both billing intervals side by side, plus the actual
// list of courses it unlocks.
//
// Unreachable at launch. Subscriptions are built and tested but not sold yet —
// no Hotmart subscription product exists — so this 404s until
// SUBSCRIPTIONS_ENABLED is set. A 404 rather than a "coming soon" page because
// the feature is not announced: there is nothing here to promise anyone yet.
export default function SubscribePage() {
    if (getSubscriptionPlans() == null) notFound();

    return (
        <main
            className={`${cinzel.className} min-h-screen w-full bg-[#0a1628] bg-linear-to-b from-[#12243f] via-[#0d1c31] to-[#0a1628]`}
        >
            <div className="mx-auto w-full max-w-4xl px-4 pt-28 pb-8 sm:pt-32">
                <div className="flex flex-col items-center gap-3 text-center">
                    <p className="text-sm tracking-[0.3em] text-ink-body uppercase">
                        Suscripción
                    </p>
                    <h1 className="text-5xl tracking-wide text-ink-bright">
                        Acceso a toda la biblioteca
                    </h1>
                    <p className="max-w-xl text-ink-body">
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

                <p className="mt-12 text-center text-sm text-ink-faint">
                    <Link
                        href="/products"
                        className="underline hover:text-ink-body"
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

    // Regional pricing is switched off in Hotmart precisely so this page and
    // the payment page always show the same number, which is why there is no
    // per-buyer discount to read here any more.
    const plans = getSubscriptionPlans();
    if (plans == null) notFound();

    const equivalentMonthly = Math.round(
        plans.yearly.equivalentMonthlyInDollars
    );

    return (
        <div className="mt-12 grid gap-6 sm:grid-cols-2">
            <PlanCard
                interval="month"
                title="Mensual"
                priceInDollars={plans.monthly.priceInDollars}
                caption="por mes"
            />
            <PlanCard
                interval="year"
                title="Anual"
                priceInDollars={plans.yearly.priceInDollars}
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


function PlanCard({
    interval,
    title,
    priceInDollars,
    caption,
    badge,
    highlighted = false,
}: {
    interval: "month" | "year";
    title: string;
    priceInDollars: number;
    caption: string;
    badge?: string;
    highlighted?: boolean;
}) {

    return (
        <div
            className={`flex flex-col gap-4 rounded-2xl border p-6 ${
                highlighted
                    ? "border-gold/60 bg-[#0a1628]/80"
                    : "border-gold/25 bg-[#0a1628]/50"
            }`}
        >
            <div className="flex items-center justify-between gap-3">
                <h2 className="text-2xl tracking-wide text-ink-bright">
                    {title}
                </h2>
                {badge && (
                    <span className="rounded border border-gold/50 px-2 py-0.5 text-xs tracking-widest text-ink uppercase">
                        {badge}
                    </span>
                )}
            </div>

            <div className="flex flex-col gap-1">
                {/* One figure, never two. There is no per-buyer discount to
                    strike through any more: regional pricing is off in Hotmart
                    so that this page and the payment page can never disagree,
                    and a plan promotion would be a different offer code rather
                    than a percentage applied here. */}
                <span className="text-4xl font-bold text-gold">
                    {formatPrice(priceInDollars)}
                </span>
                <span className="text-sm text-ink-meta">{caption}</span>
            </div>

            {/* A plain form + Server Action: no client JavaScript needed to
                start a checkout, so this works before hydration. */}
            <form
                action={startSubscriptionCheckout.bind(null, interval)}
                className="flex justify-center"
            >
                <PlaqueSubmitButton>Suscribirme</PlaqueSubmitButton>
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
