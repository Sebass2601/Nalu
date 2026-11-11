import { Suspense } from "react";
import type { Metadata } from "next";
import { cookies } from "next/headers";
import { cinzel } from "@/components/ui/fonts";
import { BackToCastleLink } from "@/components/ui/BackToHomeLink";
import { isPasswordResetValid } from "@/app/features/users/db/passwordReset";
import { RESET_COOKIE } from "@/app/features/users/lib/passwordReset";
import ResetPasswordForm, { InvalidResetLink } from "./ResetPasswordForm";

export const metadata: Metadata = {
    title: "Nueva contraseña",
    robots: { index: false },
};

// Where the reset email leads, by way of ./enlace/route.ts, which has already
// moved the key into a cookie — so this URL carries nothing secret.
//
// The cookie is request-time data, so the part that reads it sits inside
// <Suspense>, as on /login.
export default function ResetPasswordPage() {
    return (
        <main className="relative min-h-screen flex items-center justify-center p-6 bg-linear-to-b from-[#0a1628] to-[#050b16]">
            <BackToCastleLink />

            <div
                className={`${cinzel.className} w-full max-w-sm rounded-2xl border border-gold/50 bg-[#0a1628]/70 backdrop-blur-md p-8 shadow-[0_0_40px_rgba(0,0,0,0.5)] flex flex-col gap-5`}
            >
                <Suspense fallback={<ResetCardSkeleton />}>
                    <ResetCard />
                </Suspense>
            </div>
        </main>
    );
}

// Asks for a new password only if the key can still be spent. Saying so up
// front beats letting someone type a new password twice and then telling them
// the link was dead all along. The action checks again regardless.
async function ResetCard() {
    const token = (await cookies()).get(RESET_COOKIE)?.value;
    const valid = token != null && (await isPasswordResetValid(token));

    return valid ? <ResetPasswordForm /> : <InvalidResetLink />;
}

function ResetCardSkeleton() {
    return (
        <div className="flex animate-pulse flex-col gap-5">
            <div className="h-7 w-40 self-center rounded bg-gold/20" />
            <div className="h-16 rounded bg-white/5" />
            <div className="h-16 rounded bg-white/5" />
            <div className="h-10 rounded bg-gold/20" />
        </div>
    );
}
