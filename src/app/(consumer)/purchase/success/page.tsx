import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { desc, eq, gt, and } from "drizzle-orm";
import { db } from "@/drizzle/db";
import { PurchaseTable } from "@/drizzle/schema";
import { getCurrentUser } from "@/app/features/users/actions/currentUser";
import { PlaqueButton } from "@/components/ui/PlaqueButton";

// Where Hotmart sends the buyer after a successful payment.
//
// The address is configured per offer in Hotmart's dashboard, NOT per checkout,
// so it cannot carry anything about who bought what. Whether Hotmart appends a
// transaction parameter to an external thank-you URL is undocumented, and this
// page is deliberately built not to need one.
//
// What it can rely on: the buyer reached checkout from a signed-in session, so
// they are still signed in when they come back. That is enough to ask "has a
// purchase landed for this person in the last few minutes?".
//
// Access itself is granted by the webhook and nowhere else. This page only
// waits for it. That is a real change from the Stripe arrangement, where the
// return URL provisioned access itself so the buyer never saw an empty page —
// with Hotmart there is no trustworthy per-buyer token on the return trip, so
// the webhook is the single path and this page is honest about waiting.

export const dynamic = "force-dynamic";

// How recent a purchase has to be to count as "the one they just made". Long
// enough to cover a slow webhook, short enough that a purchase from yesterday
// never gets mistaken for this one.
const RECENT_PURCHASE_WINDOW_MS = 15 * 60 * 1000;

export default function PurchaseSuccessPage() {
    return (
        <main className="min-h-screen w-full bg-[#0a1628] bg-linear-to-b from-[#12243f] via-[#0d1c31] to-[#0a1628]">
            <div className="mx-auto max-w-2xl px-4 pt-32 pb-16 text-center">
                <Suspense fallback={<Waiting />}>
                    <Resolve />
                </Suspense>
            </div>
        </main>
    );
}

async function Resolve() {
    const { userId } = await getCurrentUser();

    // Signed out on the way back — an unusual path, but possible if the session
    // expired while they were on Hotmart. Their purchase is safe either way,
    // because the webhook does not depend on this browser.
    if (userId == null) redirect("/login");

    const since = new Date(Date.now() - RECENT_PURCHASE_WINDOW_MS);

    const [purchase] = await db
        .select({ productId: PurchaseTable.productId })
        .from(PurchaseTable)
        .where(
            and(
                eq(PurchaseTable.userId, userId),
                gt(PurchaseTable.createdAt, since)
            )
        )
        .orderBy(desc(PurchaseTable.createdAt))
        .limit(1);

    if (purchase != null) {
        redirect(`/products/${purchase.productId}/success`);
    }

    return <Waiting />;
}

// Shown while the webhook is still in flight.
//
// It reloads rather than polling with JavaScript: this page must work for a
// buyer whose connection dropped the page's scripts, and a meta refresh is the
// one mechanism that survives that. The page is `force-dynamic`, so each reload
// genuinely re-checks.
function Waiting() {
    return (
        <>
            <meta httpEquiv="refresh" content="3" />
            <h1 className="mb-4 text-3xl tracking-widest text-ink">
                Estamos confirmando tu pago
            </h1>
            <p className="mb-8 text-ink-body">
                Esto suele tardar unos segundos. Puedes quedarte en esta página;
                se actualiza sola.
            </p>
            <p className="mb-8 text-sm text-ink-faint">
                Si el pago fue con PIX o transferencia, la confirmación puede
                tardar más. Te avisaremos por correo en cuanto se acredite.
            </p>
            <div className="flex flex-wrap justify-center gap-3">
                <PlaqueButton href="/courses">Mis cursos</PlaqueButton>
                <Link
                    href="/products"
                    className="text-sm text-ink-meta underline underline-offset-4"
                >
                    Ver catálogo
                </Link>
            </div>
        </>
    );
}
