import { ReactNode, Suspense } from "react";
import Link from "next/link";
import Image from "next/image";
import { CastleIcon } from "lucide-react";
import { Cinzel } from "next/font/google";
import { getCurrentUser } from "@/app/features/users/actions/currentUser";
import { NavBarFrame } from "@/components/ui/NavBarFrame";
import { NavItem } from "@/components/ui/NavItem";
import { UserMenu } from "@/components/ui/UserMenu";
import { ContactWidget } from "@/components/ui/ContactWidget";
import { LegalFooter } from "@/components/ui/LegalFooter";
import { SamhainAnnouncement } from "@/app/features/products/components/SamhainAnnouncement";



const cinzel = Cinzel({ subsets: ["latin"] });

export default function ConsumerLayout({
    children
}: Readonly<{ children: ReactNode }>) {
    return (
        <>
        <Suspense fallback={<NavbarShell />}>
            <Navbar />
        </Suspense>
        {/* `relative` is the anchor LegalFooter pins itself to: the bottom of
            the page, whether that is the end of a long scroll or the bottom
            edge of the one-screen salon. `flex-1` stretches it to fill a short
            page, so the link still sits at the bottom of the window there.
            No z-index — that would make this a stacking context and trap the
            `-z-10` CarvedBackdrop the pages paint behind themselves. */}
        <div className="relative flex-1">
            {children}
            <LegalFooter />
        </div>
        {/* Fixed to the corner of every consumer page, so a question never
            depends on the visitor being on the right one. Mounted here rather
            than in the root layout deliberately: the admin side is the school's
            own workspace, and a permanent floating mark over the course editor
            is in the way rather than useful. */}
        <ContactWidget />
        {/* The Samhain sale, announced once per visit on whichever page the
            visitor arrives at — which is why it lives here and not on the home
            page: people land on a course someone sent them a link to. It
            renders nothing at all unless a promotion is running, so the rest of
            the year this line costs a cached query and draws nothing.

            Its own boundary because whether a sale is still on depends on the
            time of the request. With no fallback: there is nothing to hold a
            place for, since the panel opens over the page rather than in it.

            Consumer side only, for the reason the contact mark is. An admin
            setting up a promotion should not be told about it. */}
        <Suspense fallback={null}>
            <SamhainAnnouncement />
        </Suspense>
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
                    the pill gets its own.

                    The pill's numbers are not guesses — they centre the row in
                    the space actually left for it. Both corners are fixed
                    distances from their own edge, measured in the browser: the
                    logo ends 80px from the left (72px box at `left-2`), and the
                    pill starts 116px from the right (a 96px pill at `right-4`
                    inside a `px-1` wrapper). So the corridor between them has
                    its middle at `width/2 - 18` — at EVERY width, since the two
                    offsets are constants and the widths cancel.

                    A padded box centred by `mx-auto` sits `(pl - pr)/2` from the
                    bar's middle, so the row lands on the corridor's middle when
                    `pr - pl` is 36. It used to be 56 (`pr-32 pl-18`), which put
                    the row 28px left instead of 18 — the drift that made the
                    icons look pushed off-centre beside the pill, and the reason
                    it looked right the moment an avatar replaced it.

                    What is actually set is `pl-18 pr-22`: the corridor's middle
                    plus a deliberate 10px to the right, asked for after seeing
                    the centred version on a phone. The maths and the eye
                    disagree here for a reason — the logo is a PNG carrying about
                    10px of its own transparent margin, so the mark stops short
                    of the 80px its box claims, and geometric centring reads as
                    left-heavy. Measured at 500px: 102px clear on the left, 82 on
                    the right.

                    `sm` does the same sum with the sm numbers — the logo moves
                    to `left-4` (ends 88) and the pill grows to 108 (starts 120
                    from the right) — putting the corridor's middle at
                    `width/2 - 16`, which asks for `pr - pl` of 32. `sm:pl-0`
                    leaves `sm:pr-10` after the same nudge, replacing a `pr-40`
                    that was reserving room for a pill 2.5x its actual width.
                    Measured at 700px: 87px and 70px. At `lg` the reserve goes
                    entirely; the bar is wide enough that the row and the pill
                    cannot reach each other.

                    Both cases are sized down to 360px, where the nudge spends
                    the signed-out row's right-hand slack down to 12px — clear,
                    and the tightest point on the scale. Below that it closes on
                    the two corners, which is the same floor the admin bar
                    documents and for the same reason. */}
                <div
                    className={`mx-auto flex items-center lg:gap-4 ${
                        user == null
                            ? "gap-0 pr-22 pl-18 sm:gap-2 sm:pr-10 sm:pl-0 lg:pr-0"
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
                    {/* Suscripción had its plaque here, between Mis Cursos and
                        Admin, linking to /subscription for a member and
                        /subscribe for a visitor — the one exception in the row,
                        since /subscription manages a plan you already hold and
                        sends a sessionless visitor to /login.

                        The doorway is gone because subscriptions are switched
                        off, not because they were removed: /subscribe,
                        /subscription and /subscription-management are all still
                        here and still work if you type them. This takes the
                        invitation off the bar so nobody is walked into a
                        product that cannot be bought. Putting it back is
                        restoring this one element — nothing downstream of it
                        was touched. */}
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
