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
        return (
            <span className="inline-flex h-16 items-center px-1.5 sm:px-4">
                <Link
                    href="/login"
                    className="inline-flex items-center rounded-full border border-yellow-200/70 px-3 py-1.5 text-xs font-medium tracking-widest whitespace-nowrap text-yellow-200 transition-colors duration-200 hover:border-yellow-200 hover:bg-yellow-200/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-200/60 sm:px-5 sm:py-2 sm:text-sm"
                >
                    Iniciar sesión
                </Link>
            </span>
        )
    }

    return <UserMenuButton name={user.name} image={user.image} />
}
