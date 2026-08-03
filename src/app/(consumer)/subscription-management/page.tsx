import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/app/features/users/actions/currentUser";
import { getUserSubscription } from "@/app/features/subscriptions/db/subscriptions";
import { openBillingPortal } from "@/app/features/subscriptions/actions/subscriptions";
import { cinzel } from "@/components/ui/fonts";
import { PlaqueButton } from "@/components/ui/PlaqueButton";

// The state of your plan, and the door to Stripe's billing portal.
//
// This used to sit on top of /subscription, above the courses the plan
// includes. Splitting them separates two different errands: /subscription
// answers "what do I get", this answers "what am I paying and how do I change
// it". Only the second belongs behind "Manejar suscripción" in the avatar menu.
//
// Everything mutable — cancelling, switching interval, changing card, invoices
// — still lives in the portal rather than being rebuilt here.
export default function SubscriptionManagementPage() {
    return (
        <main
            className={`${cinzel.className} min-h-screen w-full bg-[#0a1628] bg-linear-to-b from-[#12243f] via-[#0d1c31] to-[#0a1628]`}
        >
            <div className="mx-auto w-full max-w-2xl px-4 pt-28 pb-16 sm:pt-32">
                <Suspense fallback={<Skeleton />}>
                    <SubscriptionDetails />
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
                <p className="text-sm tracking-[0.3em] text-gold-body uppercase">
                    Tu suscripción
                </p>
                <h1 className="text-4xl tracking-wide text-gold-bright">
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
                    <p className="text-sm text-gold-meta">
                        Tu suscripción está cancelada, pero conservas el acceso
                        hasta esa fecha.
                    </p>
                )}

                <form action={openBillingPortal}>
                    <PlaqueButton type="submit" className="w-full sm:w-auto">
                        Gestionar suscripción
                    </PlaqueButton>
                </form>
                <p className="text-sm text-gold-meta">
                    Cambia de plan, actualiza tu tarjeta o cancela desde el
                    portal seguro de Stripe.
                </p>
            </div>

            {/* Points at /subscription now rather than /products: the courses
                that came with this plan are the ones a subscriber is looking
                for from here, and they are what that page has been left with. */}
            <Link
                href="/subscription"
                className="text-sm tracking-widest text-gold-meta uppercase underline hover:text-gold-body"
            >
                Ver cursos incluidos
            </Link>
        </div>
    );
}

function Row({ label, value }: { label: string; value: string }) {
    return (
        <div className="flex items-baseline justify-between gap-4">
            <span className="text-base text-gold-meta">{label}</span>
            <span className="text-gold-bright">{value}</span>
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
