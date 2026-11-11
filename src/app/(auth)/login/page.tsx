import { Suspense } from "react";
import Link from "next/link";
import { cinzel } from "@/components/ui/fonts";
import LoginForm from "./LoginForm";
import GoogleSignInButton from "@/components/ui/GoogleSignInButton";
import { BackToCastleLink } from "@/components/ui/BackToHomeLink";
import { safeReturnPath } from "@/lib/returnPath";
import { authErrorMessage } from "./authErrorMessage";

// `searchParams` is request-time data, so under Cache Components the part that
// reads it sits inside <Suspense> — the same rule the lesson page follows for
// `params`. The card's frame is drawn immediately either way; only what depends
// on `next` waits.
export default function LoginPage({
    searchParams,
}: {
    searchParams: Promise<{ next?: string | string[]; error?: string | string[] }>;
}) {
    return (
        // `relative` so the way out below can pin itself to the corner of the
        // screen rather than to the centred card.
        <main className="relative min-h-screen flex items-center justify-center p-6 bg-linear-to-b from-[#0a1628] to-[#050b16]">
            <BackToCastleLink />

            <div
                className={`${cinzel.className} w-full max-w-sm rounded-2xl border border-gold/50 bg-[#0a1628]/70 backdrop-blur-md p-8 shadow-[0_0_40px_rgba(0,0,0,0.5)] flex flex-col gap-5`}
            >
                <Suspense fallback={<LoginCardSkeleton />}>
                    <LoginCard searchParams={searchParams} />
                </Suspense>
            </div>
        </main>
    );
}

// Where somebody lands after signing in. Validated here, at the edge, so every
// consumer below receives a path already known to be internal; the two sign-in
// actions check it again immediately before it becomes a redirect.
async function LoginCard({
    searchParams,
}: {
    searchParams: Promise<{ next?: string | string[]; error?: string | string[] }>;
}) {
    const params = await searchParams;
    const next = safeReturnPath(params.next);
    // Set by Auth.js when a Google sign-in failed and sent the person here
    // (see `pages` in src/auth.ts).
    const authError = authErrorMessage(params.error);

    return (
        <>
            <LoginForm next={next} authError={authError} />

            <div className="flex items-center gap-3 text-ink-faint text-xs tracking-widest">
                <span className="h-px flex-1 bg-gold/30" />
                O
                <span className="h-px flex-1 bg-gold/30" />
            </div>

            <GoogleSignInButton next={next} />

            <p className="text-sm text-center text-ink-body">
                ¿No te has registrado?{" "}
                {/* The destination travels with the link. Somebody walled out of
                    a lesson who signs up instead of signing in should still end
                    up back at the lesson. */}
                <Link
                    href={`/sign-up?next=${encodeURIComponent(next)}`}
                    className="text-ink-bright underline hover:text-white"
                >
                    Regístrate aquí
                </Link>
            </p>
        </>
    );
}

// Holds the card's shape while the query parameter resolves, so the frame does
// not visibly change size underneath the reader.
function LoginCardSkeleton() {
    return (
        <div className="flex animate-pulse flex-col gap-5">
            <div className="h-7 w-40 self-center rounded bg-gold/20" />
            <div className="h-16 rounded bg-white/5" />
            <div className="h-16 rounded bg-white/5" />
            <div className="h-10 rounded bg-gold/20" />
            <div className="h-10 rounded bg-white/5" />
        </div>
    );
}
