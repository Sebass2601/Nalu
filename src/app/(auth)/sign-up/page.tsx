import { Suspense } from "react";
import Link from "next/link";
import { cinzel } from "@/components/ui/fonts";
import SignUpForm from "./SignUpForm";
import GoogleSignInButton from "@/components/ui/GoogleSignInButton";
import { BackToCastleLink } from "@/components/ui/BackToHomeLink";
import { safeReturnPath } from "@/lib/returnPath";

// `searchParams` is request-time data, so under Cache Components the part that
// reads it sits inside <Suspense> — the same rule the lesson page follows for
// `params`. The card's frame is drawn immediately either way; only what depends
// on `next` waits.
export default function SignUpPage({
    searchParams,
}: {
    searchParams: Promise<{ next?: string | string[] }>;
}) {
    return (
        // `relative` so the way out below can pin itself to the corner of the
        // screen rather than to the centred card.
        <main className="relative min-h-screen flex items-center justify-center p-6 bg-linear-to-b from-[#0a1628] to-[#050b16]">
            <BackToCastleLink />

            <div
                className={`${cinzel.className} w-full max-w-sm rounded-2xl border border-gold/50 bg-[#0a1628]/70 backdrop-blur-md p-8 shadow-[0_0_40px_rgba(0,0,0,0.5)] flex flex-col gap-5`}
            >
                <Suspense fallback={<SignUpCardSkeleton />}>
                    <SignUpCard searchParams={searchParams} />
                </Suspense>
            </div>
        </main>
    );
}

// Where somebody lands after signing in. Validated here, at the edge, so every
// consumer below receives a path already known to be internal; the two sign-in
// actions check it again immediately before it becomes a redirect.
async function SignUpCard({
    searchParams,
}: {
    searchParams: Promise<{ next?: string | string[] }>;
}) {
    const next = safeReturnPath((await searchParams).next);

    return (
        <>
            <SignUpForm next={next} />

            <div className="flex items-center gap-3 text-ink-faint text-xs tracking-widest">
                <span className="h-px flex-1 bg-gold/30" />
                O
                <span className="h-px flex-1 bg-gold/30" />
            </div>

            <GoogleSignInButton next={next} />

            <p className="text-sm text-center text-ink-body">
                ¿Ya tienes cuenta?{" "}
                {/* The destination travels with the link, so switching between
                    the two doors does not lose the lesson somebody came for. */}
                <Link
                    href={`/login?next=${encodeURIComponent(next)}`}
                    className="text-ink-bright underline hover:text-white"
                >
                    Inicia sesión aquí
                </Link>
            </p>
        </>
    );
}

// Holds the card's shape while the query parameter resolves, so the frame does
// not visibly change size underneath the reader.
function SignUpCardSkeleton() {
    return (
        <div className="flex animate-pulse flex-col gap-5">
            <div className="h-7 w-40 self-center rounded bg-gold/20" />
            <div className="h-16 rounded bg-white/5" />
            <div className="h-16 rounded bg-white/5" />
            <div className="h-16 rounded bg-white/5" />
            <div className="h-10 rounded bg-gold/20" />
            <div className="h-10 rounded bg-white/5" />
        </div>
    );
}
