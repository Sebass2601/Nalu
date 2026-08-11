import Link from "next/link"
import { getCurrentUser } from "@/app/features/users/actions/currentUser"
import { UserMenuButton } from "./UserMenuButton"

// The last item in either navbar: the avatar when someone is signed in, the
// sign-in doorway when nobody is.
//
// Reads the database rather than the session. The JWT carries a `picture` claim
// frozen at sign-in, so a user who has just changed their photo on /profile
// would keep seeing the old one in the bar until the token rolled over. This
// read is `cache()`-deduplicated inside one render, and the navbar is already
// behind a <Suspense> boundary in both layouts, so it costs the page nothing.
export async function UserMenu() {
    const { user } = await getCurrentUser()

    if (user == null) {
        // No icon and no plaque here: a doorway out of the app is the one item
        // in the bar that has to name itself at every width, so it is a single
        // word inside a gold outline rather than a glyph with a label that a
        // phone would drop. The h-16 wrapper keeps it on the same baseline as
        // the tiles beside it, so removing the tile does not move the slot.
        //
        // Two sizes: one that holds from a phone all the way through the tablet
        // range, and the full-sized one at `lg`. It used to step up at `sm`,
        // which was backwards — `sm` is where the row STOPS reserving right
        // padding, so that was the width the pill could least afford. The row
        // now reserves a slot for it at every width below `lg` (see the
        // consumer layout), and this stays small enough to sit in that slot.
        //
        // `tracking-wide` rather than the `tracking-widest` the rest of the bar
        // wears. Fourteen letters at 0.1em spend about 15px on the gaps alone,
        // which is most of the overlap this pill was causing, and Cinzel is a
        // wide face before any tracking is added. Below `lg` the letterspacing
        // was also working against the label: at this size it pulls a single
        // word apart faster than it dignifies it. The full tracking comes back
        // at `lg`, where the pill is at a size that carries it.
        return (
            <span className="inline-flex h-16 items-center px-1 lg:px-4">
                <Link
                    href="/login"
                    className="inline-flex items-center rounded-full border border-gold/70 px-2 py-1 text-[10px] font-semibold tracking-wide whitespace-nowrap text-gold transition-colors duration-200 hover:border-gold hover:bg-gold/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/60 sm:px-2.5 sm:text-[11px] lg:px-5 lg:py-2 lg:text-sm lg:tracking-widest"
                >
                    Iniciar sesión
                </Link>
            </span>
        )
    }

    return <UserMenuButton name={user.name} image={user.image} />
}
