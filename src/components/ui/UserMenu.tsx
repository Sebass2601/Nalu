import { getCurrentUser } from "@/app/features/users/actions/currentUser"
import { NavItem } from "./NavItem"
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
        return (
            <NavItem
                href="/login"
                label="Iniciar sesión"
                icon={
                    <svg className="size-8" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24"><path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm0 0a8.949 8.949 0 0 0 4.951-1.488A3.987 3.987 0 0 0 13 16h-2a3.987 3.987 0 0 0-3.951 3.512A8.948 8.948 0 0 0 12 21Zm3-11a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"/></svg>
                }
            />
        )
    }

    return <UserMenuButton name={user.name} image={user.image} />
}
