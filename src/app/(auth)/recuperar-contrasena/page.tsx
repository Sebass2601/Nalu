import type { Metadata } from "next";
import { cinzel } from "@/components/ui/fonts";
import { BackToCastleLink } from "@/components/ui/BackToHomeLink";
import ForgotPasswordForm from "./ForgotPasswordForm";

export const metadata: Metadata = {
    title: "Recuperar contraseña",
    // A utility screen, not something anyone should land on from a search.
    robots: { index: false },
};

// Same card as /login, so the two read as one place.
export default function ForgotPasswordPage() {
    return (
        <main className="relative min-h-screen flex items-center justify-center p-6 bg-linear-to-b from-[#0a1628] to-[#050b16]">
            <BackToCastleLink />

            <div
                className={`${cinzel.className} w-full max-w-sm rounded-2xl border border-gold/50 bg-[#0a1628]/70 backdrop-blur-md p-8 shadow-[0_0_40px_rgba(0,0,0,0.5)] flex flex-col gap-5`}
            >
                <ForgotPasswordForm />
            </div>
        </main>
    );
}
