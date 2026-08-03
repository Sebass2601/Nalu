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
import { PlaqueButton } from "@/components/ui/PlaqueButton";

// Where a subscriber sees the state of their plan and gets to Stripe's billing
// portal. Everything mutable — cancelling, switching interval, changing card,
// invoices — lives in the portal rather than being rebuilt here.
export default function SubscriptionPage() {
    return (
        <main
            className={`${cinzel.className} min-h-screen w-full bg-[#0a1628] bg-linear-to-b from-[#12243f] via-[#0d1c31] to-[#0a1628]`}
        >
            <div className="mx-auto w-full max-w-2xl px-4 pt-28 pb-8 sm:pt-32">
                <Suspense fallback={<Skeleton />}>
                    <SubscriptionDetails />
                </Suspense>
            </div>

            {/* Wider than the panel above it on purpose: a row that stops at
                the panel's edge cannot show a card being cut off, and the cut
                is what says the row continues. */}
            <div className="mx-auto w-full max-w-6xl px-4 pb-16">
                {/* The eyebrow is its own boundary, separate from the band
                    below, so the band can stay public and prerendered while
                    the eyebrow — copy that only makes sense once you're a
                    member — waits on the session read. `getCurrentUser` is
                    `cache()`-deduplicated, so this costs nothing extra beyond
                    what `SubscriptionDetails` above already pays. */}
                <Suspense fallback={<EyebrowSkeleton />}>
                    <SubscriptionEyebrow />
                </Suspense>
                <Suspense fallback={<SubscriptionCourseRowsSkeleton />}>
                    <SubscriptionCourseRows emptyMessage="Aún no hay cursos incluidos en la suscripción." />
                </Suspense>
            </div>
        </main>
    );
}

// Reads the session so the "Incluido en tu plan" eyebrow only renders for a
// signed-in subscriber. Kept out of the band's own Suspense boundary: the
// band itself reads no session and must stay cacheable, and folding this into
// it would make the whole boundary request-time just to gate one line of copy.
// A signed-out visitor never actually sees this render — `SubscriptionDetails`
// redirects to /login — but until that redirect reaches the client, nothing
// here should claim membership either.
async function SubscriptionEyebrow() {
    const { user } = await getCurrentUser();
    if (user == null) return null;

    return (
        <p className="mb-6 text-sm tracking-[0.3em] text-gold-body uppercase">
            Incluido en tu plan
        </p>
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

            <Link
                href="/products"
                className="text-sm tracking-widest text-gold-meta uppercase underline hover:text-gold-body"
            >
                Ver cursos
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

function EyebrowSkeleton() {
    return (
        <div className="mb-6 h-4 w-40 animate-pulse rounded bg-yellow-200/20" />
    );
}
