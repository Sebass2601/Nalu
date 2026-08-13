// The wall a page is read against: stone rather than a gradient.
//
// This exists because /sobre-nosotros is the one page on the site with no
// artwork on it. Everywhere else a visitor is looking at a painting — the salon,
// the castle, a course's cover — and the flat navy wash those pages use as a
// backing works precisely because something else is carrying the room. On a page
// that is only text, the same wash reads as an empty div.
//
// Four layers, drawn back to front. None of them is an image file: the whole
// thing is two small SVGs repeated, which is what keeps a full-bleed texture
// from costing what a full-bleed photograph costs.
//
//   1. The ground      a deeper navy than the page wash, darkest at the edges.
//   2. The ring-chain  interlocking rings, the Norse ring-chain the Borre-style
//                      carvings are built from, laid as a lattice.
//   3. The grain       fractal noise, which is what makes the surface read as
//                      cut stone rather than as flat colour under a pattern.
//   4. The vignette    darkness closing in at the corners and the foot.
//
// The rings are also the school's own geometry. The logo is a circle crossed by
// a triangle inside a second circle, and a ring-chain is that same figure
// repeated until it becomes a wall — which is why this reads as Nalu rather than
// as a Viking texture bought in and applied.

// One tile of the ring-chain.
//
// A 200x200 square holding a ring at each corner, one at the centre, and one at
// the midpoint of each edge. Every ring that touches an edge is drawn again on
// the opposite edge, which is what makes the tile seamless: the half of a corner
// ring that falls outside the square is supplied by the neighbouring tile's own
// corner ring, and the seam lands mid-curve where there is nothing to line up.
//
// Two radii rather than one. A lattice of identical circles is a bathroom tile;
// the second, smaller ring inside each crossing is what turns it into chain —
// and it is the same doubled ring the logo draws.
const RING_CHAIN = `
<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200">
  <g fill="none" stroke="rgb(250,206,73)" stroke-opacity="0.27" stroke-width="1.25">
    <circle cx="0" cy="0" r="70"/>
    <circle cx="200" cy="0" r="70"/>
    <circle cx="0" cy="200" r="70"/>
    <circle cx="200" cy="200" r="70"/>
    <circle cx="100" cy="100" r="70"/>
    <circle cx="0" cy="0" r="58"/>
    <circle cx="200" cy="0" r="58"/>
    <circle cx="0" cy="200" r="58"/>
    <circle cx="200" cy="200" r="58"/>
    <circle cx="100" cy="100" r="58"/>
  </g>
  <g fill="rgb(250,206,73)" fill-opacity="0.3">
    <rect x="97" y="-3" width="6" height="6" transform="rotate(45 100 0)"/>
    <rect x="97" y="197" width="6" height="6" transform="rotate(45 100 200)"/>
    <rect x="-3" y="97" width="6" height="6" transform="rotate(45 0 100)"/>
    <rect x="197" y="97" width="6" height="6" transform="rotate(45 200 100)"/>
  </g>
</svg>`;

// The grain.
//
// `fractalNoise` rather than `turbulence`: turbulence layers absolute values and
// comes out as cellular blobs, which is smoke. fractalNoise keeps the sign and
// averages towards mid-grey, which is grain. A high `baseFrequency` keeps the
// speckle fine enough to read as stone at arm's length instead of as static.
//
// Desaturated to a hair of colour, because the noise is drawn in full RGB and
// left alone it stipples the wall with red and green pixels.
const GRAIN = `
<svg xmlns="http://www.w3.org/2000/svg" width="220" height="220">
  <filter id="g">
    <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="4" stitchTiles="stitch"/>
    <feColorMatrix type="saturate" values="0.08"/>
  </filter>
  <rect width="220" height="220" filter="url(#g)"/>
</svg>`;

// SVG in a `url()` has to be percent-encoded or the first `#` in it ends the
// URL. `encodeURIComponent` over the whole string is the version that cannot be
// got wrong by hand.
const svgUrl = (svg: string) =>
    `url("data:image/svg+xml,${encodeURIComponent(svg.trim())}")`;

export function CarvedBackdrop() {
    return (
        // Fixed, not absolute. The texture stays put while the text scrolls over
        // it, so the page reads as words carved into one wall rather than as a
        // long strip of patterned paper moving past. `-z-10` puts it behind the
        // page's own content without needing a stacking context on every
        // section above it.
        <div aria-hidden className="pointer-events-none fixed inset-0 -z-10">
            {/* The ground. Darker than the flat `#0a1628` the other pages use,
                because everything above it lightens the wall and the panels
                have to stay the brightest thing on the page. */}
            <div className="absolute inset-0 bg-[#070f1d] bg-linear-to-b from-[#12243f] via-[#0b1729] to-[#060c17]" />

            {/* The ring-chain, at two scales. The large pass is the wall; the
                small pass, rotated by being offset half a tile and drawn
                fainter, is what stops the eye from locking onto a single grid
                and seeing wallpaper. */}
            <div
                className="absolute inset-0"
                style={{
                    backgroundImage: svgUrl(RING_CHAIN),
                    backgroundSize: "260px 260px",
                }}
            />
            <div
                className="absolute inset-0 opacity-35"
                style={{
                    backgroundImage: svgUrl(RING_CHAIN),
                    backgroundSize: "97px 97px",
                    backgroundPosition: "48px 48px",
                }}
            />

            {/* The grain. `soft-light` rather than a plain overlay: it lightens
                where the wall is light and darkens where it is dark, so the
                noise follows the gradient underneath instead of laying a flat
                grey film over the whole page. */}
            <div
                className="absolute inset-0 opacity-[0.5] mix-blend-soft-light"
                style={{ backgroundImage: svgUrl(GRAIN) }}
            />

            {/* The vignette, in two passes: a wash closing the corners, and a
                heavier foot. Text sits in the middle of the column, which is the
                part left clear — this is what buys the contrast that the ring
                lattice spends. */}
            <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent_0%,rgba(5,11,22,0.5)_20%,rgba(5,11,22,0.72)_36%,rgba(5,11,22,0.72)_64%,rgba(5,11,22,0.5)_80%,transparent_100%)]" />
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_35%,transparent_35%,rgba(4,9,18,0.5)_85%,rgba(4,9,18,0.8)_100%)]" />
            <div className="absolute inset-x-0 bottom-0 h-64 bg-linear-to-t from-[#050b16] to-transparent" />
        </div>
    );
}
