import Link from "next/link";
import { cinzel } from "@/components/ui/fonts";
import LoginForm from "./LoginForm";
import GoogleSignInButton from "@/components/ui/GoogleSignInButton";

export default function LoginPage() {
    return (
        <main className="min-h-screen flex items-center justify-center p-6 bg-linear-to-b from-[#0a1628] to-[#050b16]">
            <div
                className={`${cinzel.className} w-full max-w-sm rounded-2xl border border-yellow-200/50 bg-[#0a1628]/70 backdrop-blur-md p-8 shadow-[0_0_40px_rgba(0,0,0,0.5)] flex flex-col gap-5`}
            >
                <LoginForm />

                <div className="flex items-center gap-3 text-yellow-200/50 text-xs tracking-widest">
                    <span className="h-px flex-1 bg-yellow-200/30" />
                    O
                    <span className="h-px flex-1 bg-yellow-200/30" />
                </div>

                <GoogleSignInButton />

                <p className="text-sm text-center text-yellow-200/80">
                    ¿No te has registrado?{" "}
                    <Link href="/sign-up" className="text-yellow-200 underline hover:text-white">
                        Regístrate aquí
                    </Link>
                </p>
            </div>
        </main>
    );
}
