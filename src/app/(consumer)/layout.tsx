import { ReactNode, Suspense } from "react";
import Link from "next/link";
import Image from "next/image";
import { CastleIcon } from "lucide-react";
import { Cinzel } from "next/font/google";
import { getCurrentUser } from "@/app/features/users/actions/currentUser";
import { NavBarFrame } from "@/components/ui/NavBarFrame";
import { NavItem } from "@/components/ui/NavItem";
import { UserMenu } from "@/components/ui/UserMenu";



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
    // The database user, not the session. `UserMenu` needs a picture that
    // reflects the last upload rather than the one baked into the JWT at
    // sign-in, and the same read answers the two questions this bar asks —
    // whether anyone is signed in, and whether they are an admin.
    const { user } = await getCurrentUser();
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
                        // Next 16 deprecated `priority` in favour of `preload`,
                        // but the docs steer to `loading="eager"` in most cases
                        // and this is one: the mark is 88px wide and never the
                        // largest thing painted, so it wants to skip lazy-loading
                        // without taking a preload slot. On the two parallax
                        // pages that slot belongs to the artwork, which is both
                        // the hero and a CSS background the browser would
                        // otherwise find late.
                        loading="eager"
                    />
                </Link>

                {/* On a phone the row is squeezed between two fixed corners —
                    the logo on the left, the corner item on the right — so it
                    is padded clear of both. The padding is what keeps it
                    centred: `mx-auto` centres the padded box in the whole bar,
                    so without the right side the row would drift into that
                    corner. From `sm` up the left side gives way, letting the
                    row centre in the bar proper.

                    How much the RIGHT side gives way depends on what is in that
                    corner, which is why this reads `user`. The two things
                    `UserMenu` can put there are nothing like the same width: an
                    avatar is a 48px disc, and "Iniciar sesión" is fourteen
                    letters of Cinzel inside a pill. Reserving one number for
                    both meant one of the two cases was always wrong — and it
                    was the pill's, which overhung the last plaque on a phone
                    and, because the reserve vanished at `sm`, overhung it worse
                    on a tablet than on the phone the padding was written for.

                    So: the avatar keeps the tight reserve it always had, and
                    the pill gets one wide enough to hold it, carried through
                    the tablet range and dropped at `lg` where the bar is wide
                    enough that the row and the pill cannot reach each other.
                    The gap closes to nothing on a phone in the signed-out case
                    for the same reason the admin bar closes its own: the
                    plaques carry their own padding, so the icons still stand
                    12px apart and the 6px buys back a little of the reserve.

                    The signed-out case also opens 8px earlier on the left
                    (`pl-18` against the avatar's `pl-20`). The logo is a 72px
                    box whose PNG carries about 10px of its own transparent
                    margin, so the mark itself stops around 70px in and `pl-20`
                    was clearing empty pixels. Spending those 8px here is what
                    carries a 360px phone — the width where the reserve runs
                    past the bar and the row can no longer be nudged left by
                    centring — from touching the pill to clearing it.

                    Both cases are sized down to 360px. Below that the
                    signed-out row and the pill meet, which is the same floor
                    the admin bar documents and for the same reason. */}
                <div
                    className={`mx-auto flex items-center lg:gap-4 ${
                        user == null
                            ? "gap-0 pr-32 pl-18 sm:gap-2 sm:pr-40 sm:pl-0 lg:pr-0"
                            : "gap-0.5 pr-16 pl-20 sm:gap-2 sm:pr-0 sm:pl-0"
                    }`}
                >
                    <NavItem
                        href="/"
                        label="Inicio"
                        icon={
                            <svg className="size-8" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24"><path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="m4 12 8-8 8 8M6 10.5V19a1 1 0 0 0 1 1h3v-3a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v3h3a1 1 0 0 0 1-1v-8.5"/></svg>
                        }
                    />
                    {/* The castle, which stopped being the root when the salon
                        took `/` and would otherwise be reachable only through
                        the arch. Called "Explorar" rather than "Cursos" because
                        it sits next to "Mis Cursos": one is the catalogue and
                        the other is what you already own, and two plaques a word
                        apart would make a visitor stop and read. */}
                    <NavItem
                        href="/fetch-courses"
                        label="Explorar"
                        icon={<CastleIcon className="size-8" aria-hidden />}
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
                        href={user ? "/subscription" : "/subscribe"}
                        label="Suscripción"
                        icon={
                            <svg className="size-8" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24"><path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h18M7 15h4m-7 5h16a1 1 0 0 0 1-1V6a1 1 0 0 0-1-1H4a1 1 0 0 0-1 1v13a1 1 0 0 0 1 1Z"/></svg>
                        }
                    />
                    {/* Compras is no longer a doorway of its own. A receipt log
                        is something you go looking for once in a while, not a
                        section of the site you move between, so it now lives
                        under the avatar with the rest of the account screens —
                        which is also what buys the bar the width for them. */}
                    {user?.role === "admin" && (
                        <NavItem
                            href="/admin"
                            label="Admin"
                            icon={
                                <svg className="size-8" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24"><path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 3l7 3v5c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3Zm0 6a2 2 0 1 0 0 4 2 2 0 0 0 0-4Zm0 4c-1.7 0-3 1-3 2.2 0 .4.3.8.7.8h4.6c.4 0 .7-.4.7-.8 0-1.2-1.3-2.2-3-2.2Z"/></svg>
                            }
                        />
                    )}
                </div>

                {/* Pinned to the right corner, mirroring the logo on the left
                    — you and the mark, with the doorways between them. Absolute
                    like the logo rather than a member of the row, so the row
                    still centres in the bar itself and not in whatever space
                    these two leave over.
                    Sign-out used to be a plaque in the row; it is now one item
                    of four inside this menu, and `UserMenu` decides between the
                    avatar and the sign-in doorway on its own. */}
                {/* Set further in than the logo's own `left-2 sm:left-4`, and
                    deliberately so: the logo is a PNG carrying its own
                    transparent margin, so its mark already sits inside its box,
                    while the avatar's gold ring is its true edge. Matching the
                    numbers would leave the avatar looking closer to the screen
                    edge than the logo does. */}
                <div className="absolute top-1/2 right-4 -translate-y-1/2 sm:right-8">
                    <UserMenu />
                </div>
            </div>
        </NavBarFrame>
    );
}
