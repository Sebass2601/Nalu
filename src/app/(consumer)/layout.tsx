import { ReactNode, Suspense } from "react";
import Link from "next/link";
import Image from "next/image";
import { Cinzel } from "next/font/google";
import { auth, signOut } from "@/auth";
import type { Session } from "next-auth";



const cinzel = Cinzel({ subsets: ["latin"] });

export default function ConsumerLayout({
    children
}: Readonly<{ children: ReactNode }>) {
    return (
        <>
        <Suspense fallback={<NavbarShell />}>
            <Navbar />
        </Suspense>
        {children}
        </>
    );
}

// Static bar rendered instantly while the session streams in
function NavbarShell() {
    return (
        <div className={`${cinzel.className} fixed top-0 left-0 z-50 w-full h-20 bg-[#0a1628]/70 backdrop-blur-md border-b border-yellow-200`} />
    );
}

async function Navbar() {
    const session: Session | null = await auth();
    return (
        <div className={`${cinzel.className} fixed top-0 left-0 z-50 w-full h-20 bg-[#0a1628]/70 backdrop-blur-md border-b border-yellow-200`}>
            <Link href="/" className="absolute left-4 top-1/2 -translate-y-1/2 inline-flex items-center">
                <Image src="/nalu_logo.png" alt="Nalu logo" width={64} height={64} className="h-16 w-16" priority />
            </Link>
            <Link href="/" className="absolute right-4 top-1/2 -translate-y-1/2 text-yellow-200 hover:text-white inline-flex flex-col items-center justify-center group">
                <svg className="size-7 sm:size-6 mb-1" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24"><path stroke="currentColor" strokeLinecap="round" strokeWidth="2" d="M6 4v10m0 0a2 2 0 1 0 0 4m0-4a2 2 0 1 1 0 4m0 0v2m6-16v2m0 0a2 2 0 1 0 0 4m0-4a2 2 0 1 1 0 4m0 0v10m6-16v10m0 0a2 2 0 1 0 0 4m0-4a2 2 0 1 1 0 4m0 0v2"/></svg>
                <span className="hidden sm:block text-xs tracking-widest">Configuración</span>
            </Link>
            <div className="flex items-center justify-center gap-3 sm:gap-10 h-full mx-auto">
                <Link href="/" className="text-yellow-200 hover:text-white inline-flex flex-col items-center justify-center px-3 sm:px-5 group">
                    <svg className="size-7 sm:size-6 mb-1" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24"><path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="m4 12 8-8 8 8M6 10.5V19a1 1 0 0 0 1 1h3v-3a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v3h3a1 1 0 0 0 1-1v-8.5"/></svg>
                    <span className="hidden sm:block text-xs tracking-widest">Inicio</span>
                </Link>
                {session?.user && (
                <>
                    <Link href="/courses" className="text-yellow-200 hover:text-white inline-flex flex-col items-center justify-center px-3 sm:px-5 group">
                        <svg className="size-7 sm:size-6 mb-1" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24"><path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 19V4a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v13H7a2 2 0 0 0-2 2Zm0 0a2 2 0 0 0 2 2h12M9 3v14m7 0v4"/></svg>
                        <span className="hidden sm:block text-xs text-center tracking-widest">Mis Cursos</span>
                    </Link>
                    <Link href="/purchases" className="text-yellow-200 hover:text-white inline-flex flex-col items-center justify-center px-3 sm:px-5 group">
                        <svg className="size-7 sm:size-6 mb-1" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24"><path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 2l1.5 2h9L18 2M5 4h14l-1 16a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1L5 4Zm4 6h6m-6 4h6"/></svg>
                        <span className="hidden sm:block text-xs text-center tracking-widest">Compras</span>
                    </Link>
                    {session.user.role === "admin" && (
                        <Link href="/admin" className="text-yellow-200 hover:text-white inline-flex flex-col items-center justify-center px-3 sm:px-5 group">
                            <svg className="size-7 sm:size-6 mb-1" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24"><path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 3l7 3v5c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3Zm0 6a2 2 0 1 0 0 4 2 2 0 0 0 0-4Zm0 4c-1.7 0-3 1-3 2.2 0 .4.3.8.7.8h4.6c.4 0 .7-.4.7-.8 0-1.2-1.3-2.2-3-2.2Z"/></svg>
                            <span className="hidden sm:block text-xs text-center tracking-widest">Admin</span>
                        </Link>
                    )}
                </>
                )}
                {session?.user ? (
                <form
                    action={async () => {
                        "use server";
                        await signOut();
                    }}
                    className="contents"
                >
                    <button className="text-yellow-200 hover:text-white inline-flex flex-col items-center justify-center px-3 sm:px-5 group cursor-pointer">
                        <svg className="size-7 sm:size-6 mb-1" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24"><path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm0 0a8.949 8.949 0 0 0 4.951-1.488A3.987 3.987 0 0 0 13 16h-2a3.987 3.987 0 0 0-3.951 3.512A8.948 8.948 0 0 0 12 21Zm3-11a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"/></svg>
                        <span className="hidden sm:block text-xs tracking-widest">Cerrar sesión</span>
                    </button>
                </form>
                ) : (
                <Link href="/login" className="text-yellow-200 hover:text-white inline-flex flex-col items-center justify-center px-3 sm:px-5 group">
                    <svg className="size-7 sm:size-6 mb-1" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24"><path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm0 0a8.949 8.949 0 0 0 4.951-1.488A3.987 3.987 0 0 0 13 16h-2a3.987 3.987 0 0 0-3.951 3.512A8.948 8.948 0 0 0 12 21Zm3-11a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"/></svg>
                    <span className="hidden sm:block text-xs tracking-widest">Iniciar sesión</span>
                </Link>
                )}
            </div>
        </div>
    );
}