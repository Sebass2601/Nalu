import Link from "next/link"
import { Cinzel } from "next/font/google"
import { cn } from "@/lib/utils"
import { bevelFace, bevelOutline, Diamond } from "./plaque"

const cinzel = Cinzel({ subsets: ["latin"] })

const CUT = 12 // Pixels sliced off each corner.

const FACE = bevelFace(CUT)
// The navbar's gold rule, wrapped around the plaque.
const BORDER = bevelOutline({ cut: CUT, inset: 0, width: 2 })
// Faint second line, purely decorative.
const HAIRLINE = bevelOutline({ cut: CUT, inset: 5, width: 1 })

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
        // `hover:active:` so a phone tap changes nothing — a bare `active:`
        // translate made iOS Safari drop the clip-path'd layers mid-press.
        // See the same line in PlaqueButton.
        "transition-transform duration-200 ease-out hover:-translate-y-0.5 hover:active:translate-y-0",
        "focus-visible:outline-none",
        className
      )}
    >
      {/* Frosted glass face, tinted and blurred exactly like the navbar. */}
      <div
        // Tighter on a phone, where the whole plaque is drawn at around two
        // thirds size and generous padding is spent on emptiness that no
        // longer reads as generous. The room it gives back is what lets the
        // lettering grow: the doorways nearest each other in the artwork are
        // what cap how large these can go, and a shorter, narrower plaque
        // pushes that cap up.
        className="relative bg-[#0a1628]/70 px-5 py-2 backdrop-blur-md transition-colors duration-300 group-hover:bg-[#0a1628]/85 sm:px-7 sm:py-3"
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
