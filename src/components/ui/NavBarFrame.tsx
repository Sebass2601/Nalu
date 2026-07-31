import type { ReactNode } from "react"

// The bar both navbars hang from, wearing the same edge as the plaques inside
// it: a 2px gold rule with a fainter 1px line set 5px above it — the identical
// weights and spacing a plaque carries around its own border.
//
// Only the bottom edge is ever seen, the other three sitting off-screen, so
// that is the only one drawn. Shared rather than written twice because the two
// navbars and the consumer bar's loading shell are the same object, and three
// copies of this would drift the first time one of them was touched.
export function NavBarFrame({ children }: { children?: ReactNode }) {
    return (
        // 96px. Every page clears this with its own top padding rather than a
        // shared token, so the height and those paddings move together: `pt-32`
        // on the consumer pages, `pt-24` on admin's white surface, `lg:top-32`
        // on the two sticky course panels. Change one, change all of them.
        <div className="fixed top-0 left-0 z-50 h-24 w-full bg-[#0a1628]/70 backdrop-blur-md">
            {children}
            <span
                aria-hidden
                className="pointer-events-none absolute inset-x-0 bottom-0 h-0.5 bg-yellow-200"
            />
            <span
                aria-hidden
                className="pointer-events-none absolute inset-x-0 bottom-[5px] h-px bg-yellow-200/40"
            />
        </div>
    )
}
