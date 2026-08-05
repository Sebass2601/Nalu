import Link from "next/link";
import { cinzel } from "@/components/ui/fonts";
import SignUpForm from "./SignUpForm";
import GoogleSignInButton from "@/components/ui/GoogleSignInButton";
import { BackToHomeLink } from "@/components/ui/BackToHomeLink";

export default function SignUpPage() {
    return (
        // `relative` so the way out below can pin itself to the corner of the
        // screen rather than to the centred card.
        <main className="relative min-h-screen flex items-center justify-center p-6 bg-linear-to-b from-[#0a1628] to-[#050b16]">
            <BackToHomeLink />

            <div
                className={`${cinzel.className} w-full max-w-sm rounded-2xl border border-gold/50 bg-[#0a1628]/70 backdrop-blur-md p-8 shadow-[0_0_40px_rgba(0,0,0,0.5)] flex flex-col gap-5`}
            >
                <SignUpForm />

                <div className="flex items-center gap-3 text-ink-faint text-xs tracking-widest">
                    <span className="h-px flex-1 bg-gold/30" />
                    O
                    <span className="h-px flex-1 bg-gold/30" />
                </div>

                <GoogleSignInButton />

                <p className="text-sm text-center text-ink-body">
                    ¿Ya tienes cuenta?{" "}
                    <Link href="/login" className="text-ink-bright underline hover:text-white">
                        Inicia sesión aquí
                    </Link>
                </p>
            </div>
        </main>
    );
}
