import { signIn } from "@/auth";

// Shared by the login and sign-up pages. It's a server component whose form
// runs the Google sign-in server action, mirroring the navbar's approach.
export default function GoogleSignInButton() {
    return (
        <form
            action={async () => {
                "use server";
                await signIn("google", { redirectTo: "/" });
            }}
            className="w-full"
        >
            <button
                type="submit"
                className="w-full inline-flex items-center justify-center gap-3 rounded-md border border-gold/40 bg-white/5 px-4 py-2 tracking-widest text-ink-bright hover:bg-white/10 cursor-pointer"
            >
                <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
                    <path
                        fill="#EA4335"
                        d="M12 5.04c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 1.6 14.97.6 12 .6 7.7.6 3.99 3.07 2.18 6.71l3.66 2.84C6.71 6.89 9.14 5.04 12 5.04Z"
                    />
                    <path
                        fill="#4285F4"
                        d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47a5.53 5.53 0 0 1-2.4 3.63v3h3.86c2.26-2.09 3.56-5.17 3.56-8.87Z"
                    />
                    <path
                        fill="#FBBC05"
                        d="M5.84 14.09a7.17 7.17 0 0 1 0-4.18l-3.66-2.84a11.86 11.86 0 0 0 0 9.86l3.66-2.84Z"
                    />
                    <path
                        fill="#34A853"
                        d="M12 23.4c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-2.86 0-5.29-1.93-6.16-4.53l-3.66 2.84C3.99 20.93 7.7 23.4 12 23.4Z"
                    />
                </svg>
                <span>Continuar con Google</span>
            </button>
        </form>
    );
}
