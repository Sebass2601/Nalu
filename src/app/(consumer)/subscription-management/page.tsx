import { Suspense } from "react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { env } from "@/data/env/server";
import type { SubscriptionStatus } from "@/drizzle/schema";
import { getCurrentUser } from "@/app/features/users/actions/currentUser";
import { getUserSubscription } from "@/app/features/subscriptions/db/subscriptions";
import { cancelSubscription } from "@/app/features/subscriptions/actions/subscriptions";
import { cinzel } from "@/components/ui/fonts";
import { PlaqueSubmitButton } from "@/components/ui/PlaqueSubmitButton";

// The state of your plan, and the button that ends it.
//
// This used to sit on top of /subscription, above the courses the plan
// includes. Splitting them separates two different errands: /subscription
// answers "what do I get", this answers "what am I paying and how do I change
// it". Only the second belongs behind "Manejar suscripción" in the avatar menu.
//
// Stripe had a hosted billing portal that handled cancelling, switching
// interval, changing card and invoices in one place. Hotmart has no equivalent
// we can create a session for — but it does expose a real cancellation
// endpoint, so the one operation that matters is a working button here rather
// than a link out. Card changes and invoices live in the buyer's own Hotmart
// account, which it emails them a link to.
export default function SubscriptionManagementPage() {
    // Reading the flag here is what keeps this route dynamic, so the switch can
    // be flipped in app.env without a rebuild. It costs one DYNAMIC_SERVER_USAGE
    // notice per route at build time; see lib/plans.ts for why that is correct.
    if (!env.SUBSCRIPTIONS_ENABLED) notFound();

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
                <p className="text-sm tracking-[0.3em] text-ink-body uppercase">
                    Tu suscripción
                </p>
                <h1 className="text-4xl tracking-wide text-ink-bright">
                    Plan {subscription.interval === "month" ? "mensual" : "anual"}
                </h1>
            </div>

            <div className="flex flex-col gap-4 rounded-2xl border border-gold/30 bg-[#0a1628]/60 p-6">
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
                    <p className="text-sm text-ink-meta">
                        Tu suscripción está cancelada, pero conservas el acceso
                        hasta esa fecha.
                    </p>
                )}

                <form action={cancelSubscription}>
                    <PlaqueSubmitButton className="w-full sm:w-auto">
                        Cancelar suscripción
                    </PlaqueSubmitButton>
                </form>
                <p className="text-sm text-ink-meta">
                    Conservas el acceso hasta el final del periodo que ya
                    pagaste. Para cambiar de plan o actualizar tu tarjeta, entra
                    a tu cuenta de Hotmart.
                </p>
            </div>

            {/* Points at /subscription now rather than /products: the courses
                that came with this plan are the ones a subscriber is looking
                for from here, and they are what that page has been left with. */}
            <Link
                href="/subscription"
                className="text-sm tracking-widest text-ink-meta uppercase underline hover:text-ink-body"
            >
                Ver cursos incluidos
            </Link>
        </div>
    );
}

function Row({ label, value }: { label: string; value: string }) {
    return (
        <div className="flex items-baseline justify-between gap-4">
            <span className="text-base text-ink-meta">{label}</span>
            <span className="text-ink-bright">{value}</span>
        </div>
    );
}

// Hotmart's status vocabulary, in Spanish.
//
// The overdue states are deliberately spelled out rather than shown as
// "Activa": the customer still has access, but they need to know a payment
// failed or they will be surprised when Hotmart eventually gives up and cuts
// them off.
//
// Typed as SubscriptionStatus rather than string so that adding a status to the
// enum without adding a label here becomes a compile error instead of a raw
// DELAYED appearing on someone's account page.
function statusLabel(status: SubscriptionStatus): string {
    switch (status) {
        case "ACTIVE":
        case "STARTED":
            return "Activa";
        case "DELAYED":
        case "OVERDUE":
            return "Pago pendiente — revisa tu método de pago";
        case "INACTIVE":
            return "Inactiva";
        case "CANCELLED_BY_CUSTOMER":
            return "Cancelada por ti";
        case "CANCELLED_BY_SELLER":
        case "CANCELLED_BY_ADMIN":
            return "Cancelada";
    }
}

function Skeleton() {
    return (
        <div className="flex animate-pulse flex-col gap-8">
            <div className="h-8 w-56 rounded bg-gold/20" />
            <div className="h-48 rounded-2xl bg-[#0a1628]/40" />
        </div>
    );
}
