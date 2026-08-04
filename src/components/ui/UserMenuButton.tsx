"use client"

import Image from "next/image"
import Link from "next/link"
import { DropdownMenu } from "radix-ui"
import {
    CreditCardIcon,
    LogOutIcon,
    ReceiptTextIcon,
    UserIcon,
    UserPenIcon,
} from "lucide-react"
import { signOutAction } from "@/app/features/users/actions/signOut"
import { cn } from "@/lib/utils"

// The avatar at the end of the navbar, and the menu it opens.
//
// Deliberately not a plaque. Every other item in the bar is a bevelled tile
// marking a section of the site; this one is you, and a circle is the one shape
// in the bar that cannot be mistaken for another doorway. The gold ring is what
// keeps it in the same family.
//
// A Client Component because a menu that opens on click has to be — which is
// why sign-out arrives as an imported Server Action rather than being declared
// inline the way the old navbar form did it.
export function UserMenuButton({
    name,
    image,
}: {
    name: string
    image: string | null
}) {
    return (
        <DropdownMenu.Root>
            <DropdownMenu.Trigger
                aria-label="Menú de perfil"
                className={cn(
                    // 64px tall to match the plaques, which is also what gives
                    // the circle a thumb-sized target rather than a 44px one.
                    // No horizontal padding: this no longer sits in the row and
                    // so owes it no rhythm — the layout places it in the corner
                    // and the offset belongs there, next to the logo's.
                    "group inline-flex h-16 items-center select-none",
                    "transition-transform duration-200 ease-out",
                    // `hover:active:` so a phone tap changes nothing — a bare
                    // `active:` translate made iOS Safari drop clip-path'd
                    // layers mid-press. See the same line in PlaqueButton.
                    "hover:-translate-y-0.5 hover:active:translate-y-0",
                    "focus-visible:outline-none focus-visible:-translate-y-0.5",
                    "cursor-pointer"
                )}
            >
                <span
                    className={cn(
                        "relative block size-11 overflow-hidden rounded-full",
                        // `ring` rather than `border`: a border would be inside
                        // the circle and the picture would have to shrink to
                        // clear it. The ring is drawn outside the 44px, so the
                        // face stays the full width.
                        "bg-[#0a1628] ring-2 ring-yellow-200 ring-offset-0",
                        "transition-shadow duration-200",
                        "group-hover:ring-yellow-100",
                        "group-data-[state=open]:ring-yellow-100"
                    )}
                >
                    {image ? (
                        <Image
                            src={image}
                            alt=""
                            fill
                            sizes="44px"
                            className="object-cover"
                        />
                    ) : (
                        // Most accounts are created with an email and a
                        // password and never get a picture, so this is the
                        // common case rather than the fallback.
                        <UserIcon
                            aria-hidden
                            className="absolute inset-0 m-auto size-6 text-yellow-200"
                        />
                    )}
                </span>
            </DropdownMenu.Trigger>

            <DropdownMenu.Portal>
                <DropdownMenu.Content
                    align="end"
                    // Clears the navbar's bottom rule instead of touching it.
                    sideOffset={8}
                    collisionPadding={8}
                    className={cn(
                        "z-50 w-60 overflow-hidden rounded-2xl p-1.5",
                        "border border-yellow-200/30 bg-[#0a1628]/95 backdrop-blur-md",
                        "shadow-lg shadow-black/40",
                        "data-[state=open]:animate-in data-[state=closed]:animate-out",
                        "data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0",
                        "data-[state=open]:zoom-in-95 data-[state=closed]:zoom-out-95",
                        "data-[side=bottom]:slide-in-from-top-2"
                    )}
                >
                    {/* Whose menu this is. The trigger is a picture and, on a
                        phone, a small one — without this the menu could belong
                        to anybody. */}
                    <p className="truncate px-3 pt-2 pb-3 text-xs tracking-widest text-gold-meta uppercase">
                        {name}
                    </p>

                    <MenuLink
                        href="/profile"
                        label="Editar perfil"
                        icon={<UserPenIcon aria-hidden className="size-4" />}
                    />
                    <MenuLink
                        href="/subscription-management"
                        label="Manejar suscripción"
                        icon={<CreditCardIcon aria-hidden className="size-4" />}
                    />
                    <MenuLink
                        href="/purchases"
                        label="Historial de compras"
                        icon={<ReceiptTextIcon aria-hidden className="size-4" />}
                    />

                    <DropdownMenu.Separator className="my-1.5 h-px bg-yellow-200/20" />

                    {/* The one item that acts rather than navigates, so it is a
                        form posting a Server Action. `asChild` hands the menu
                        item's keyboard and focus behaviour to the button, which
                        keeps it reachable by arrow keys like the links above. */}
                    <form action={signOutAction}>
                        <DropdownMenu.Item asChild>
                            <button
                                type="submit"
                                className={cn(
                                    ITEM,
                                    "w-full cursor-pointer text-red-400",
                                    "focus:bg-red-400/10 focus:text-red-300",
                                    "data-highlighted:bg-red-400/10 data-highlighted:text-red-300"
                                )}
                            >
                                <LogOutIcon aria-hidden className="size-4" />
                                Cerrar sesión
                            </button>
                        </DropdownMenu.Item>
                    </form>
                </DropdownMenu.Content>
            </DropdownMenu.Portal>
        </DropdownMenu.Root>
    )
}

// Shared by the links and the sign-out button so the red item differs from its
// neighbours in colour alone and not in height or spacing.
const ITEM = cn(
    "flex items-center gap-3 rounded-xl px-3 py-2.5",
    "text-left text-sm tracking-wide text-gold-body",
    "outline-none transition-colors",
    "data-highlighted:bg-yellow-200/10 data-highlighted:text-gold-bright"
)

function MenuLink({
    href,
    label,
    icon,
}: {
    href: string
    label: string
    icon: React.ReactNode
}) {
    return (
        <DropdownMenu.Item asChild>
            <Link href={href} className={ITEM}>
                {icon}
                {label}
            </Link>
        </DropdownMenu.Item>
    )
}
