import { ReactNode, Suspense } from "react";
import Link from "next/link";
import Image from "next/image";
import { Cinzel } from "next/font/google";
import { auth, signOut } from "@/auth";
import type { Session } from "next-auth";
import { NavBarFrame } from "@/components/ui/NavBarFrame";
import { NavItem } from "@/components/ui/NavItem";



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
    return <NavBarFrame />;
}

// The logo, and the row of plaques. On a phone the row is pushed clear of the
// logo and the labels drop away, leaving the icons enough width to breathe;
// from `sm` up the labels return and the row centres in the bar proper.
async function Navbar() {
    const session: Session | null = await auth();
    return (
        <NavBarFrame>
            <div className={`${cinzel.className} flex h-full items-center`}>
                <Link
                    href="/"
                    className="absolute top-1/2 left-2 inline-flex -translate-y-1/2 items-center sm:left-4"
                >
                    <Image
                        src="/nalu_logo.png"
                        alt="Nalu logo"
                        width={64}
                        height={64}
                        className="h-18 w-18 lg:h-22 lg:w-22"
                        priority
                    />
                </Link>

                <div className="mx-auto flex items-center gap-1 pl-20 sm:gap-2 sm:pl-0 lg:gap-4">
                    <NavItem
                        href="/"
                        label="Inicio"
                        icon={
                            <svg className="size-8" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24"><path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="m4 12 8-8 8 8M6 10.5V19a1 1 0 0 0 1 1h3v-3a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v3h3a1 1 0 0 0 1-1v-8.5"/></svg>
                        }
                    />
                    {/* Visitors see the same doorways a member does. Both pages
                        behind these two greet a signed-out visitor with their own
                        panel, so neither needs a session to be worth opening. */}
                    <NavItem
                        href="/courses"
                        label="Mis Cursos"
                        icon={
                            <svg className="size-8" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24"><path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 19V4a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v13H7a2 2 0 0 0-2 2Zm0 0a2 2 0 0 0 2 2h12M9 3v14m7 0v4"/></svg>
                        }
                    />
                    {/* The exception: /subscription manages a plan you already hold
                        and redirects anyone without a session to /login, so a
                        visitor is sent to the public pricing page instead. */}
                    <NavItem
                        href={session?.user ? "/subscription" : "/subscribe"}
                        label="Suscripción"
                        icon={
                            <svg className="size-8" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24"><path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h18M7 15h4m-7 5h16a1 1 0 0 0 1-1V6a1 1 0 0 0-1-1H4a1 1 0 0 0-1 1v13a1 1 0 0 0 1 1Z"/></svg>
                        }
                    />
                    <NavItem
                        href="/purchases"
                        label="Compras"
                        icon={
                            <svg className="size-8" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24"><path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 2l1.5 2h9L18 2M5 4h14l-1 16a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1L5 4Zm4 6h6m-6 4h6"/></svg>
                        }
                    />
                    {session?.user?.role === "admin" && (
                        <NavItem
                            href="/admin"
                            label="Admin"
                            icon={
                                <svg className="size-8" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24"><path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 3l7 3v5c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3Zm0 6a2 2 0 1 0 0 4 2 2 0 0 0 0-4Zm0 4c-1.7 0-3 1-3 2.2 0 .4.3.8.7.8h4.6c.4 0 .7-.4.7-.8 0-1.2-1.3-2.2-3-2.2Z"/></svg>
                            }
                        />
                    )}
                    {session?.user ? (
                    <form
                        action={async () => {
                            "use server";
                            await signOut();
                        }}
                        // `contents` so the button below is laid out by the row
                        // itself and sits level with the plaques beside it.
                        className="contents"
                    >
                        <NavItem
                            label="Cerrar sesión"
                            icon={
                                <svg className="size-8" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24"><path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm0 0a8.949 8.949 0 0 0 4.951-1.488A3.987 3.987 0 0 0 13 16h-2a3.987 3.987 0 0 0-3.951 3.512A8.948 8.948 0 0 0 12 21Zm3-11a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"/></svg>
                            }
                        />
                    </form>
                    ) : (
                    <NavItem
                        href="/login"
                        label="Iniciar sesión"
                        icon={
                            <svg className="size-8" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24"><path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm0 0a8.949 8.949 0 0 0 4.951-1.488A3.987 3.987 0 0 0 13 16h-2a3.987 3.987 0 0 0-3.951 3.512A8.948 8.948 0 0 0 12 21Zm3-11a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"/></svg>
                        }
                    />
                    )}
                </div>
            </div>
        </NavBarFrame>
    );
}
