import Link from "next/link";
import { cinzel } from "@/app/components/ui/fonts";
import SignUpForm from "./SignUpForm";
import GoogleSignInButton from "@/app/components/ui/GoogleSignInButton";

export default function SignUpPage() {
    return (
        <main className="min-h-screen flex items-center justify-center p-6 bg-linear-to-b from-[#0a1628] to-[#050b16]">
            <div
                className={`${cinzel.className} w-full max-w-sm rounded-2xl border border-yellow-200/50 bg-[#0a1628]/70 backdrop-blur-md p-8 shadow-[0_0_40px_rgba(0,0,0,0.5)] flex flex-col gap-5`}
            >
                <SignUpForm />

                <div className="flex items-center gap-3 text-yellow-200/50 text-xs tracking-widest">
                    <span className="h-px flex-1 bg-yellow-200/30" />
                    O
                    <span className="h-px flex-1 bg-yellow-200/30" />
                </div>

                <GoogleSignInButton />

                <p className="text-sm text-center text-yellow-200/80">
                    ¿Ya tienes cuenta?{" "}
                    <Link href="/login" className="text-yellow-200 underline hover:text-white">
                        Inicia sesión aquí
                    </Link>
                </p>
            </div>
        </main>
    );
}
