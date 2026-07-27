import Link from "next/link"
import { Cinzel } from "next/font/google"
import { cn } from "@/lib/utils"

const cinzel = Cinzel({ subsets: ["latin"] })

const CUT = 12 // Pixels sliced off each corner.

const end = (n: number) => `calc(100% - ${n}px)`

// Builds an octagon: a rectangle with each corner cut off at 45 degrees.
const bevel = (cut: number) =>
  `polygon(
    ${cut}px 0%, ${end(cut)} 0%,
    100% ${cut}px, 100% ${end(cut)},
    ${end(cut)} 100%, ${cut}px 100%,
    0% ${end(cut)}, 0% ${cut}px
  )`

// Traces that same octagon as a hollow line, `inset` px in from the element's
// edge and `width` px thick. It is a single polygon that walks the outer edge
// clockwise, drops straight down at the top middle, then walks the inner edge
// anticlockwise. The two opposite directions cancel, leaving the middle unfilled
// — a border that keeps its mitred corners, which a plain CSS border cannot do
// once clip-path has cut those corners away.
//
// Every octagon parallel to the face meets its straight sides at the same
// distance from the element's edge, whatever its inset, which is why the outer
// corner is always CUT. The inner corner is nudged out by width * (√2 - 1) so
// the diagonal stretches end up as thick as the straight ones.
const outline = (inset: number, width: number) => {
  const o = inset
  const i = inset + width
  const co = CUT
  const ci = CUT + width * (Math.SQRT2 - 1)
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

const FACE = bevel(CUT)
const BORDER = outline(0, 2) // The navbar's gold rule, wrapped around the plaque.
const HAIRLINE = outline(5, 1) // Faint second line, purely decorative.

type CategoryButtonProps = Omit<React.ComponentProps<typeof Link>, "children"> & {
  children: string
}

// Breaks a label across two lines at the word boundary that leaves both halves
// as close to the same length as possible. Doing it by hand rather than letting
// the text wrap on its own is what guarantees two lines: wrapping depends on how
// wide the plaque happens to be, so a short label would stay on one line and a
// long one would spill onto three. A single word is left alone.
function twoLines(label: string) {
  const words = label.trim().split(/\s+/)
  if (words.length < 2) return words

  let split = 1
  let smallestGap = Infinity
  for (let i = 1; i < words.length; i++) {
    const gap = Math.abs(
      words.slice(0, i).join(" ").length - words.slice(i).join(" ").length
    )
    if (gap < smallestGap) {
      smallestGap = gap
      split = i
    }
  }

  return [words.slice(0, split).join(" "), words.slice(split).join(" ")]
}

// Small rotated square that straddles the top and bottom edges of the plaque.
function Diamond({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        "pointer-events-none absolute left-1/2 grid size-2.5 -translate-x-1/2 rotate-45 place-items-center bg-yellow-200",
        className
      )}
    >
      <span className="size-1 bg-[#0a1628]" />
    </span>
  )
}

export default function CategoryButton({
  children,
  className,
  ...props
}: CategoryButtonProps) {
  return (
    <Link
      {...props}
      className={cn(
        cinzel.className,
        "group relative inline-block select-none",
        "transition-transform duration-200 ease-out hover:-translate-y-0.5 active:translate-y-0",
        "focus-visible:outline-none",
        className
      )}
    >
      {/* Frosted glass face, tinted and blurred exactly like the navbar. */}
      <div
        className="relative bg-[#0a1628]/70 px-7 py-3 backdrop-blur-md transition-colors duration-300 group-hover:bg-[#0a1628]/85"
        style={{ clipPath: FACE }}
      >
        {/* Light sweep that crosses the glass on hover. */}
        <span
          aria-hidden
          className="absolute inset-y-0 -left-full w-1/2 -skew-x-12 bg-white/10 blur-md transition-transform duration-700 ease-out group-hover:translate-x-[400%]"
        />
        <span
          className="relative block text-center text-base leading-tight tracking-[0.24em] text-yellow-200 uppercase transition-colors duration-200 group-hover:text-white"
          style={{ textShadow: "0 0 12px rgba(254,240,138,0.35)" }}
        >
          {twoLines(children).map((line, index) => (
            // The indent cancels the trailing space letter-spacing adds after
            // the last character, keeping each line optically centred.
            <span key={index} className="block indent-[0.24em]">
              {line}
            </span>
          ))}
        </span>
      </div>

      {/* Gold rules sit on top, so the glass underneath stays see-through. */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-yellow-200 transition-colors duration-200 group-hover:bg-white"
        style={{ clipPath: BORDER }}
      />
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-yellow-200 opacity-40"
        style={{ clipPath: HAIRLINE }}
      />

      {/* Ornaments sit outside the face so they can overhang its edges. */}
      <Diamond className="top-0 -translate-y-1/2" />
      <Diamond className="bottom-0 translate-y-1/2" />
    </Link>
  )
}
