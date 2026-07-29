import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/app/features/users/actions/currentUser";
import { getUserSubscription } from "@/app/features/subscriptions/db/subscriptions";
import { openBillingPortal } from "@/app/features/subscriptions/actions/subscriptions";
import { cinzel } from "@/components/ui/fonts";
import {
    SubscriptionCourseRows,
    SubscriptionCourseRowsSkeleton,
} from "@/app/features/courses/components/SubscriptionCourseRows";

// Where a subscriber sees the state of their plan and gets to Stripe's billing
// portal. Everything mutable — cancelling, switching interval, changing card,
// invoices — lives in the portal rather than being rebuilt here.
export default function SubscriptionPage() {
    return (
        <main
            className={`${cinzel.className} min-h-screen w-full bg-[#0a1628] bg-linear-to-b from-[#12243f] via-[#0d1c31] to-[#0a1628]`}
        >
            <div className="mx-auto w-full max-w-2xl px-4 pt-24 pb-8 sm:pt-28">
                <Suspense fallback={<Skeleton />}>
                    <SubscriptionDetails />
                </Suspense>
            </div>

            {/* Wider than the panel above it on purpose: a row that stops at
                the panel's edge cannot show a card being cut off, and the cut
                is what says the row continues. */}
            <div className="mx-auto w-full max-w-6xl px-4 pb-16">
                <p className="mb-6 text-xs tracking-[0.3em] text-yellow-200/70 uppercase">
                    Incluido en tu plan
                </p>
                <Suspense fallback={<SubscriptionCourseRowsSkeleton />}>
                    <SubscriptionCourseRows emptyMessage="Aún no hay cursos incluidos en la suscripción." />
                </Suspense>
            </div>
        </main>
    );
}

async function SubscriptionDetails() {
    const { user } = await getCurrentUser();
    if (user == null) redirect("/login");

    const subscription = await getUserSubscription(user.id);

    // No active subscription — send them to the offer rather than showing an
    // empty management screen.
    if (subscription == null) redirect("/subscribe");

    const renewsOn = subscription.currentPeriodEnd.toLocaleDateString("es", {
        day: "numeric",
        month: "long",
        year: "numeric",
    });

    return (
        <div className="flex flex-col gap-8">
            <div className="flex flex-col gap-2">
                <p className="text-xs tracking-[0.3em] text-yellow-200/70 uppercase">
                    Tu suscripción
                </p>
                <h1 className="text-3xl tracking-wide text-yellow-100">
                    Plan {subscription.interval === "month" ? "mensual" : "anual"}
                </h1>
            </div>

            <div className="flex flex-col gap-4 rounded-2xl border border-yellow-200/30 bg-[#0a1628]/60 p-6">
                <Row label="Estado" value={statusLabel(subscription.status)} />
                <Row
                    // Wording follows the actual state: a subscription set to
                    // cancel still works until the paid period runs out, so
                    // calling that date a "renewal" would be wrong.
                    label={
                        subscription.cancelAtPeriodEnd
                            ? "Acceso hasta"
                            : "Se renueva el"
                    }
                    value={renewsOn}
                />

                {subscription.cancelAtPeriodEnd && (
                    <p className="text-xs text-yellow-200/60">
                        Tu suscripción está cancelada, pero conservas el acceso
                        hasta esa fecha.
                    </p>
                )}

                <form action={openBillingPortal}>
                    <button
                        type="submit"
                        className="w-full cursor-pointer rounded-lg border border-yellow-200/60 px-6 py-3 tracking-widest text-yellow-200 uppercase transition-colors hover:bg-yellow-200 hover:text-[#0a1628] sm:w-auto"
                    >
                        Gestionar suscripción
                    </button>
                </form>
                <p className="text-xs text-yellow-200/50">
                    Cambia de plan, actualiza tu tarjeta o cancela desde el
                    portal seguro de Stripe.
                </p>
            </div>

            <Link
                href="/products"
                className="text-xs tracking-widest text-yellow-200/50 uppercase underline hover:text-yellow-200/80"
            >
                Ver cursos
            </Link>
        </div>
    );
}

function Row({ label, value }: { label: string; value: string }) {
    return (
        <div className="flex items-baseline justify-between gap-4">
            <span className="text-sm text-yellow-200/60">{label}</span>
            <span className="text-yellow-100">{value}</span>
        </div>
    );
}

// `past_due` is deliberately spelled out rather than shown as "active": the
// customer still has access, but they need to know a payment failed or they
// will be surprised when Stripe eventually gives up and cuts them off.
function statusLabel(status: string) {
    switch (status) {
        case "active":
            return "Activa";
        case "trialing":
            return "Período de prueba";
        case "past_due":
            return "Pago pendiente — revisa tu tarjeta";
        default:
            return status;
    }
}

function Skeleton() {
    return (
        <div className="flex animate-pulse flex-col gap-8">
            <div className="h-8 w-56 rounded bg-yellow-200/20" />
            <div className="h-48 rounded-2xl bg-[#0a1628]/40" />
        </div>
    );
}
