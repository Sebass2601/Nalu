import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/app/features/users/actions/currentUser";
import { getUserSubscription } from "@/app/features/subscriptions/db/subscriptions";
import { cinzel } from "@/components/ui/fonts";
import {
    SubscriptionCourseRows,
    SubscriptionCourseRowsSkeleton,
} from "@/app/features/courses/components/SubscriptionCourseRows";

// What your plan gets you: the courses included in the subscription, and
// nothing else.
//
// The plan's own details — status, renewal date, the door to Stripe's billing
// portal — moved to /subscription-management, reached from the avatar menu.
// This page is now the answer to "what do I get", which is what the
// Suscripción doorway in the navbar has always been asking.
export default function SubscriptionPage() {
    return (
        <main
            className={`${cinzel.className} min-h-screen w-full bg-[#0a1628] bg-linear-to-b from-[#12243f] via-[#0d1c31] to-[#0a1628]`}
        >
            {/* Wider than a reading column on purpose: a row that stops at a
                panel's edge cannot show a card being cut off, and the cut is
                what says the row continues. */}
            <div className="mx-auto w-full max-w-6xl px-4 pt-28 pb-16 sm:pt-32">
                {/* The gate is its own boundary, separate from the band below,
                    so the band can stay public and prerendered while the check
                    — which reads the session and the subscription — waits on
                    request-time data. */}
                <Suspense fallback={<EyebrowSkeleton />}>
                    <SubscriberGate />
                </Suspense>
                <Suspense fallback={<SubscriptionCourseRowsSkeleton />}>
                    <SubscriptionCourseRows emptyMessage="Aún no hay cursos incluidos en la suscripción." />
                </Suspense>
            </div>
        </main>
    );
}

// Who is allowed to be here, and the one line of copy that only makes sense
// once you are.
//
// Both redirects used to live inside the plan panel that has moved out; they
// stay on this page rather than travelling with it, because the navbar sends
// every signed-in visitor here and the behaviour they meet should not change:
// no session goes to /login, no subscription goes to the offer.
//
// `getCurrentUser` is `cache()`-deduplicated, so this costs nothing beyond the
// session read the layout's navbar already pays for.
async function SubscriberGate() {
    const { user } = await getCurrentUser();
    if (user == null) redirect("/login");

    const subscription = await getUserSubscription(user.id);
    if (subscription == null) redirect("/subscribe");

    return (
        <p className="mb-6 text-sm tracking-[0.3em] text-ink-body uppercase">
            Incluido en tu plan
        </p>
    );
}

function EyebrowSkeleton() {
    return (
        <div className="mb-6 h-4 w-40 animate-pulse rounded bg-gold/20" />
    );
}
