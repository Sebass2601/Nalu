import { ReactNode, Suspense } from "react";
import Link from "next/link";
import Image from "next/image";
import { Cinzel } from "next/font/google";
import { requireAdmin } from "@/app/features/users/actions/currentUser";



const cinzel = Cinzel({ subsets: ["latin"] });

export default function AdminLayout({
    children
}: Readonly<{ children: ReactNode }>) {
    // The static nav chrome renders instantly in the prerendered shell.
    // The dynamic auth gate is isolated behind <Suspense> so reading the
    // session (which touches cookies) doesn't block the whole route under
    // Cache Components (`cacheComponents: true`).
    return (
        <>
        <Navbar />
        <main className="pt-20">
            <Suspense fallback={null}>
                <AdminGate>{children}</AdminGate>
            </Suspense>
        </main>
        </>
    );
}

// Secure initial gate: proxy.ts is only an optimistic pre-filter, so this
// checks the current database role before any admin content streams in. Each
// admin page repeats the memoized check because layouts do not rerender on
// every client navigation; Server Actions and upload handlers check it too.
async function AdminGate({ children }: { children: ReactNode }) {
    await requireAdmin();
    return <>{children}</>;
}

function Navbar() {
    return (
        <div className={`${cinzel.className} fixed top-0 left-0 z-50 w-full h-20 bg-[#0a1628]/70 backdrop-blur-md border-b border-yellow-200`}>
            <Link href="/" className="absolute left-4 top-1/2 -translate-y-1/2 inline-flex items-center">
                <Image src="/nalu_logo.png" alt="Nalu logo" width={64} height={64} className="h-16 w-16" priority />
            </Link>
            <div className="grid grid-cols-5 h-full max-w-2xl mx-auto">
                <Link href="/admin/products" className="text-yellow-200 hover:text-white inline-flex flex-col items-center justify-center px-5 group">
                    <svg className="w-6 h-6 mb-1" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24"><path stroke="currentColor" strokeLinecap="round" strokeWidth="2" d="M6 4v10m0 0a2 2 0 1 0 0 4m0-4a2 2 0 1 1 0 4m0 0v2m6-16v2m0 0a2 2 0 1 0 0 4m0-4a2 2 0 1 1 0 4m0 0v10m6-16v10m0 0a2 2 0 1 0 0 4m0-4a2 2 0 1 1 0 4m0 0v2"/></svg>
                    <span className="text-xs tracking-widest items-center">Productos</span>
                </Link>
                <Link href="/admin/courses" className="text-yellow-200 hover:text-white inline-flex flex-col items-center justify-center px-5 group">
                    <svg className="w-6 h-6 mb-1" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24"><path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 19V4a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v13H7a2 2 0 0 0-2 2Zm0 0a2 2 0 0 0 2 2h12M9 3v14m7 0v4"/></svg>
                    <span className="text-xs text-center tracking-widest">Cursos</span>
                </Link>
                <Link href="/admin/categories" className="text-yellow-200 hover:text-white inline-flex flex-col items-center justify-center px-5 group">
                    <svg className="w-6 h-6 mb-1" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24"><path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6a2 2 0 0 1 2-2h4l2 2h6a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6Z"/></svg>
                    <span className="text-xs text-center tracking-widest">Categorías</span>
                </Link>
                <Link href="/admin/purchases" className="text-yellow-200 hover:text-white inline-flex flex-col items-center justify-center px-5 group">
                    <svg className="w-6 h-6 mb-1" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24"><path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 2l1.5 2h9L18 2M5 4h14l-1 16a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1L5 4Zm4 6h6m-6 4h6"/></svg>
                    <span className="text-xs text-center tracking-widest">Ventas</span>
                </Link>
                <Link href="/admin/country-groups" className="text-yellow-200 hover:text-white inline-flex flex-col items-center justify-center px-5 group">
                    <svg className="w-6 h-6 mb-1" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24"><path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12h18M12 3c2.5 2.5 3.5 6 3.5 9s-1 6.5-3.5 9c-2.5-2.5-3.5-6-3.5-9s1-6.5 3.5-9Z M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Z"/></svg>
                    <span className="text-xs text-center tracking-widest">PPA</span>
                </Link>
            </div>
        </div>
    );
}
