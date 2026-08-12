import { redirect } from "next/navigation";
import { Suspense } from "react";
import { and, desc, eq, gt, sql } from "drizzle-orm";
import { db } from "@/drizzle/db";
import { PurchaseTable } from "@/drizzle/schema";
import { getCurrentUser } from "@/app/features/users/actions/currentUser";
import { cinzel } from "@/components/ui/fonts";
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

// No route segment config: `cacheComponents` rejects it. Under Cache
// Components a page is dynamic because of what it reads, not what it declares —
// `Resolve` below reads the session and queries the database uncached, which is
// what makes each reload genuinely re-check rather than replay a cached answer.

// How recent a purchase has to be to count as "the one they just made". Long
// enough to cover a slow webhook, short enough that a purchase from yesterday
// never gets mistaken for this one.
//
// Evaluated by Postgres rather than here. Two reasons: `createdAt` is stamped
// by the database, so comparing it against this process's clock invites skew
// between the two; and reading the current time during render is an impure call
// that React's compiler rightly rejects.
const RECENT_PURCHASE_WINDOW = sql`interval '15 minutes'`;

export default function PurchaseSuccessPage() {
    return (
        <main
            className={`${cinzel.className} min-h-screen w-full bg-[#0a1628] bg-linear-to-b from-[#12243f] via-[#0d1c31] to-[#0a1628]`}
        >
            <div className="mx-auto flex max-w-2xl flex-col items-center gap-8 px-4 pt-32 pb-16 text-center">
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

    const [purchase] = await db
        .select({ productId: PurchaseTable.productId })
        .from(PurchaseTable)
        .where(
            and(
                eq(PurchaseTable.userId, userId),
                gt(
                    PurchaseTable.createdAt,
                    sql`now() - ${RECENT_PURCHASE_WINDOW}`
                )
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
// one mechanism that survives that. `Resolve` reads the session and queries
// uncached, so each reload genuinely re-checks rather than replaying an answer.
function Waiting() {
    return (
        <>
            <meta httpEquiv="refresh" content="3" />
            <div className="flex flex-col gap-3">
                <p className="text-sm tracking-[0.3em] text-ink-body uppercase">
                    Confirmando
                </p>
                <h1 className="text-5xl tracking-wide text-ink-bright">
                    Estamos confirmando tu pago
                </h1>
                <p className="text-xl text-ink-body">
                    Esto suele tardar unos segundos. Puedes quedarte en esta
                    página; se actualiza sola.
                </p>
                {/* Deliberately promises no email. Hotmart sends its own
                    payment confirmation, but for an external members area the
                    access details are the creator's to send — and we send none,
                    so the course appearing on its own is the whole story. */}
                <p className="text-base text-ink-meta">
                    Si el pago fue con PIX o transferencia, la confirmación
                    puede tardar más. El curso aparecerá solo en Mis cursos en
                    cuanto se acredite.
                </p>
            </div>

            <div className="flex w-full flex-col items-stretch gap-4 sm:w-auto sm:flex-row sm:items-center sm:justify-center">
                <PlaqueButton href="/courses" className="w-full sm:w-auto">
                    Mis cursos
                </PlaqueButton>
                <PlaqueButton
                    href="/products"
                    variant="secondary"
                    className="w-full sm:w-auto"
                >
                    Ver catálogo
                </PlaqueButton>
            </div>
        </>
    );
}
