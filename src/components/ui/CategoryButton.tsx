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

// The caption bar hanging under the plaque is the same octagon at a smaller
// corner, so it reads as a piece of the same object rather than a second one.
// It carries a single hairline where the plaque carries two: at this height the
// pair closes up into a smudge, and the caption is meant to sit under the name
// rather than compete with it.
const CAPTION_CUT = 7
const CAPTION_FACE = bevelFace(CAPTION_CUT)
const CAPTION_BORDER = bevelOutline({ cut: CAPTION_CUT, inset: 0, width: 1 })

type CategoryButtonProps = Omit<React.ComponentProps<typeof Link>, "children"> & {
  children: string
  // A few words shown on a smaller bar joined to the bottom of the plaque.
  // Nothing is drawn without one, so a plaque with no caption is exactly the
  // plaque that existed before there were captions.
  caption?: string
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
  caption,
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
      {/* The plaque proper. It is wrapped so that the gold rules and the
          diamonds below, which are positioned against their container, keep
          measuring the plaque alone once a caption bar is hung underneath —
          without this they would stretch around both.

          `z-10` puts it over that bar, which is what lets the bottom diamond
          straddle the seam between the two instead of being painted out by the
          bar arriving after it. */}
      <span className="relative z-10 block">
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
            className="relative block text-center text-base leading-tight tracking-[0.24em] text-gold uppercase transition-colors duration-200 group-hover:text-white"
            // The glow has to be written out rather than reading `--color-gold`,
            // because `textShadow` needs an rgba to fade and a CSS variable
            // cannot be given an alpha inline. Keep it in step with the token.
            style={{ textShadow: "0 0 12px rgba(250,206,73,0.35)" }}
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
          className="pointer-events-none absolute inset-0 bg-gold transition-colors duration-200 group-hover:bg-white"
          style={{ clipPath: BORDER }}
        />
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-gold opacity-40"
          style={{ clipPath: HAIRLINE }}
        />

        {/* Ornaments sit outside the face so they can overhang its edges. */}
        <Diamond className="top-0 -translate-y-1/2" />
        <Diamond className="bottom-0 translate-y-1/2" />
      </span>

      {/* The caption: the category's description, a few words on a slimmer bar
          butted straight against the bottom of the plaque. No gap, because the
          diamond already sitting on that edge is what joins them — a space
          would leave the diamond floating between two separate objects.

          Sized by its own text rather than given a width, so the bar is only as
          long as the words on it. The cap is in characters rather than a
          percentage of the plaque: the plaque has no width of its own to take a
          percentage of — it is as wide as its widest child, so an uncapped
          caption would not be clipped by the plaque, it would stretch it.

          The cap is 26ch for about 22 characters of caption: `ch` measures the
          glyph and not the 0.18em of letter-spacing added after it, so a cap
          set at the number of characters wanted cuts words off several short of
          it. Descriptions are meant to be one to four words; a longer one is
          cut short with an ellipsis rather than allowed to reshape the
          doorway. */}
      {caption && (
        <span className="relative mx-auto block w-fit max-w-[26ch]">
          <span
            className="block truncate bg-[#0a1628]/70 px-3 py-1 text-center text-[0.625rem] leading-tight tracking-[0.18em] text-gold/75 uppercase backdrop-blur-md transition-colors duration-300 group-hover:bg-[#0a1628]/85 group-hover:text-gold sm:px-4 sm:py-1.5 sm:text-xs"
            style={{ clipPath: CAPTION_FACE }}
          >
            {/* Cancels the trailing space letter-spacing leaves after the last
                character, exactly as the label above does. */}
            <span className="block indent-[0.18em]">{caption}</span>
          </span>
          {/* One rule only, and dimmer than the plaque's: the caption is read
              after the name, and matching the plaque's gold would make the two
              bars compete for the eye. */}
          <span
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-gold opacity-40 transition-opacity duration-200 group-hover:opacity-70"
            style={{ clipPath: CAPTION_BORDER }}
          />
        </span>
      )}
    </Link>
  )
}
