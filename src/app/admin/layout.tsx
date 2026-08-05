import type { Viewport } from "next";
import { ReactNode, Suspense } from "react";
import Link from "next/link";
import Image from "next/image";
import { Cinzel } from "next/font/google";
import { requireAdmin } from "@/app/features/users/actions/currentUser";
import { NavBarFrame } from "@/components/ui/NavBarFrame";
import { NavItem } from "@/components/ui/NavItem";
import { UserMenu } from "@/components/ui/UserMenu";



const cinzel = Cinzel({ subsets: ["latin"] });

// Viewport is merged root-to-leaf with duplicate keys replaced, so this keeps
// the root's navy `themeColor` (the admin navbar is the same navy) while
// overriding only the colour scheme: admin content is light, so UA-drawn parts
// — form controls, scrollbars — should render light here rather than dark.
export const viewport: Viewport = {
    colorScheme: "light",
};

export default function AdminLayout({
    children
}: Readonly<{ children: ReactNode }>) {
    // The bar itself renders instantly in the prerendered shell; the doorways
    // inside it stream in a moment later.
    //
    // They have to. The plaque marks which section you are in, which means
    // reading the current path, and under Cache Components `usePathname` is
    // request-time data on any route carrying a dynamic param — /admin has
    // several. Without this boundary it blocks the whole route from
    // prerendering, which is a far worse trade than a bar that fills in.
    //
    // The dynamic auth gate is isolated behind its own <Suspense> so reading
    // the session (which touches cookies) doesn't block the route either.
    return (
        <>
        <Suspense fallback={<NavBarFrame />}>
            <Navbar />
        </Suspense>
        {/* An opaque white surface over the navy canvas, so the admin pages
            that paint no background of their own (the new/edit forms) stay
            light. Pages with their own background, like the navy dashboard,
            simply draw over it. min-h-dvh includes the padding under
            border-box, so this adds no scroll of its own. */}
        <main className="pt-24 min-h-dvh bg-white">
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

// The same bar and the same plaques as the consumer side. An admin moving
// between the two should feel they walked through a door, not into a different
// building — so the only thing that differs here is what the doorways lead to.
function Navbar() {
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
                        // See the consumer bar: `priority` is deprecated in
                        // Next 16, and eager loading is what this mark actually
                        // wanted.
                        loading="eager"
                    />
                </Link>

                {/* Padded clear of both corners and centred by that padding,
                    exactly as the consumer bar is. The gap closes to nothing on
                    a phone, which it does not have to do over there: five
                    plaques plus the logo and the avatar do not fit a small
                    phone, and the 16px of gaps is the cheapest thing to give
                    up. The plaques keep their own 6px of padding, so the icons
                    still sit 12px apart rather than touching.
                    Even so this bar runs out of room below about 380px and the
                    last plaque meets the avatar. Left that way on purpose:
                    admin work happens on a desktop, and the alternative was
                    shrinking the logo on phones for a screen nobody manages
                    courses from. The consumer bar, which does get used on a
                    phone, has room to spare. */}
                <div className="mx-auto flex items-center gap-0 pr-16 pl-20 sm:gap-2 sm:pr-0 sm:pl-0 lg:gap-4">
                    <NavItem
                        href="/admin/products"
                        label="Productos"
                        icon={
                            <svg className="size-8" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24"><path stroke="currentColor" strokeLinecap="round" strokeWidth="2" d="M6 4v10m0 0a2 2 0 1 0 0 4m0-4a2 2 0 1 1 0 4m0 0v2m6-16v2m0 0a2 2 0 1 0 0 4m0-4a2 2 0 1 1 0 4m0 0v10m6-16v10m0 0a2 2 0 1 0 0 4m0-4a2 2 0 1 1 0 4m0 0v2"/></svg>
                        }
                    />
                    <NavItem
                        href="/admin/courses"
                        label="Cursos"
                        icon={
                            <svg className="size-8" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24"><path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 19V4a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v13H7a2 2 0 0 0-2 2Zm0 0a2 2 0 0 0 2 2h12M9 3v14m7 0v4"/></svg>
                        }
                    />
                    <NavItem
                        href="/admin/categories"
                        label="Categorías"
                        icon={
                            <svg className="size-8" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24"><path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6a2 2 0 0 1 2-2h4l2 2h6a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6Z"/></svg>
                        }
                    />
                    <NavItem
                        href="/admin/purchases"
                        label="Ventas"
                        icon={
                            <svg className="size-8" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24"><path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 2l1.5 2h9L18 2M5 4h14l-1 16a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1L5 4Zm4 6h6m-6 4h6"/></svg>
                        }
                    />
                    <NavItem
                        href="/admin/country-groups"
                        label="PPA"
                        icon={
                            <svg className="size-8" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24"><path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12h18M12 3c2.5 2.5 3.5 6 3.5 9s-1 6.5-3.5 9c-2.5-2.5-3.5-6-3.5-9s1-6.5 3.5-9Z M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Z"/></svg>
                        }
                    />
                </div>

                {/* Same right corner as the consumer bar, mirroring the logo.
                    The admin bar had no way out of it at all — signing out
                    meant walking back to the consumer side first. The four
                    screens behind it are an admin's own account, not admin
                    tooling. */}
                <div className="absolute top-1/2 right-4 -translate-y-1/2 sm:right-8">
                    <UserMenu />
                </div>
            </div>
        </NavBarFrame>
    );
}
