import { ReactNode } from "react";
import Link from "next/link";
import Image from "next/image";
import { Cinzel } from "next/font/google";



const cinzel = Cinzel({ subsets: ["latin"] });

export default function AdminLayout({
    children
}: Readonly<{ children: ReactNode }>) {
    return (
        <>
        <Navbar />
        <main className="pt-20">{children}</main>
        </>
    );
}

function Navbar() {
    return (
        <div className={`${cinzel.className} fixed top-0 left-0 z-50 w-full h-20 bg-[#0a1628]/70 backdrop-blur-md border-b border-yellow-200`}>
            <Link href="/" className="absolute left-4 top-1/2 -translate-y-1/2 inline-flex items-center">
                <Image src="/nalu_logo.png" alt="Nalu logo" width={64} height={64} className="h-16 w-16" priority />
            </Link>
            <div className="grid grid-cols-3 h-full max-w-lg mx-auto">
                <Link href="/admin/products" className="text-yellow-200 hover:text-white inline-flex flex-col items-center justify-center px-5 group">
                    <svg className="w-6 h-6 mb-1" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24"><path stroke="currentColor" strokeLinecap="round" strokeWidth="2" d="M6 4v10m0 0a2 2 0 1 0 0 4m0-4a2 2 0 1 1 0 4m0 0v2m6-16v2m0 0a2 2 0 1 0 0 4m0-4a2 2 0 1 1 0 4m0 0v10m6-16v10m0 0a2 2 0 1 0 0 4m0-4a2 2 0 1 1 0 4m0 0v2"/></svg>
                    <span className="text-xs tracking-widest items-center">Products</span>
                </Link>
                <Link href="/admin/courses" className="text-yellow-200 hover:text-white inline-flex flex-col items-center justify-center px-5 group">
                    <svg className="w-6 h-6 mb-1" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24"><path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 19V4a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v13H7a2 2 0 0 0-2 2Zm0 0a2 2 0 0 0 2 2h12M9 3v14m7 0v4"/></svg>
                    <span className="text-xs text-center tracking-widest">Courses</span>
                </Link>
                <Link href="/admin/purchases" className="text-yellow-200 hover:text-white inline-flex flex-col items-center justify-center px-5 group">
                    <svg className="w-6 h-6 mb-1" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24"><path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 2l1.5 2h9L18 2M5 4h14l-1 16a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1L5 4Zm4 6h6m-6 4h6"/></svg>
                    <span className="text-xs text-center tracking-widest">Sales</span>
                </Link>
            </div>
        </div>
    );
}
