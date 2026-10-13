import { cn } from "@/lib/utils"

// The plaque: the bevelled octagon that the category doorways on the home page
// and the navbars are both cut from. A rectangle with all four corners sliced
// off at 45 degrees, edged with a gold rule and a fainter one inside it, and
// pinned top and bottom by a small diamond.
//
// It lives here rather than inside any one component because it is the same
// object at three sizes. Two copies of the geometry below would drift the first
// time either was touched, and the shape is the thing that makes a doorway and
// a navbar item recognisably parts of the same building.

const end = (n: number) => `calc(100% - ${n}px)`

// The filled face.
export function bevelFace(cut: number) {
    return `polygon(
    ${cut}px 0%, ${end(cut)} 0%,
    100% ${cut}px, 100% ${end(cut)},
    ${end(cut)} 100%, ${cut}px 100%,
    0% ${end(cut)}, 0% ${cut}px
  )`
}

// That same octagon traced as a hollow line, `inset` px in from the element's
// edge and `width` px thick. It is a single polygon that walks the outer edge
// clockwise, drops straight down at the top middle, then walks the inner edge
// anticlockwise. The two opposite directions cancel, leaving the middle unfilled
// — a border that keeps its mitred corners, which a plain CSS border cannot do
// once clip-path has cut those corners away.
//
// Every octagon parallel to the face meets its straight sides at the same
// distance from the element's edge, whatever its inset, which is why the outer
// corner is always `cut`. The inner corner is nudged out by width * (√2 - 1) so
// the diagonal stretches end up as thick as the straight ones.
export function bevelOutline({
    cut,
    inset,
    width,
}: {
    cut: number
    inset: number
    width: number
}) {
    const o = inset
    const i = inset + width
    const co = cut
    const ci = cut + width * (Math.SQRT2 - 1)
    return `polygon(
    50% ${o}px, ${end(co)} ${o}px, ${end(o)} ${co}px,
    ${end(o)} ${end(co)}, ${end(co)} ${end(o)},
    ${co}px ${end(o)}, ${o}px ${end(co)}, ${o}px ${co}px,
    ${co}px ${o}px, 50% ${o}px,
    50% ${i}px, ${ci}px ${i}px, ${i}px ${ci}px,
    ${i}px ${end(ci)}, ${ci}px ${end(i)},
    ${end(ci)} ${end(i)}, ${end(i)} ${end(ci)},
    ${end(i)} ${ci}px, ${end(ci)} ${i}px, 50% ${i}px
  )`
}

// Small rotated square that straddles the top and bottom edges of a plaque.
//
// `tone` is which side of the edge it has to survive. A diamond half on the
// plaque and half on the page can only be read if it contrasts with both, so
// gold works on a dark face and navy works on a gold one — and the navy is
// ringed in gold, because its outer half sits on a dark page where a bare navy
// diamond would vanish.
//
// `metal` is what the plaque it sits on is cast in. Gold everywhere but the
// Samhain announcement, whose panel and button are pumpkin — and a gold diamond
// pinned to an orange plaque is the one detail that would give away that the
// two were not made together. It swaps the metal and leaves the tone's logic
// exactly as it was.
const METALS = {
    gold: { fill: "bg-gold", ring: "ring-gold" },
    pumpkin: { fill: "bg-pumpkin", ring: "ring-pumpkin" },
} as const

export function Diamond({
    className,
    tone = "gold",
    metal = "gold",
}: {
    className?: string
    tone?: "gold" | "navy"
    metal?: keyof typeof METALS
}) {
    const { fill, ring } = METALS[metal]

    return (
        <span
            aria-hidden
            className={cn(
                "pointer-events-none absolute left-1/2 grid size-2.5 -translate-x-1/2 rotate-45 place-items-center",
                // Both tones draw on the same metal, which is the point of
                // there being one: the ring around the navy diamond and the
                // face it straddles are the same colour, so it reads as cut out
                // of the plaque rather than laid on top of it.
                tone === "gold" ? fill : cn("bg-[#0a1628] ring-1", ring),
                className
            )}
        >
            <span
                className={cn(
                    "size-1",
                    tone === "gold" ? "bg-[#0a1628]" : fill
                )}
            />
        </span>
    )
}
