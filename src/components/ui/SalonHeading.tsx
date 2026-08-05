import { cinzel } from "./fonts"

// The lettering inside the arch of the salon.
//
// Written at the artwork's own resolution — every size below is in pixels of the
// 1536x1024 painting, not of the screen — because the parallax scales it by the
// same factor it scales the picture. A block sized in `rem` would stay put while
// the scene grew around it.
//
// Navy rather than the site's gold. globals.css reserves gold for what you press
// and ink for what you read, and this is neither: it is painted on the view
// through the arch, a bright sky where ink would disappear and gold would fight
// the plaques for attention. Navy is the artwork's own colour, and the reference
// this was drawn from uses it.
//
// The whole block runs about 240px tall, which is what the page positions it by.
// The figure that matters is the navbar: the fixed 96px bar has to clear the top
// of this block when the page opens, with the camera still at its resting
// position. Panning may slide the heading behind the bar afterwards — that was a
// deliberate call, since no position in the arch survives a full pan on every
// screen, and buying that would have cost most of the type's size.
export function SalonHeading() {
    return (
        <div className={`${cinzel.className} w-190 text-center text-[#0a1628]`}>
            {/* The mark as the banners either side of the arch already set it:
                the name alone and large, the descriptor small and wide beneath.
                Not the reference's big/small/big stack, which was built around
                "del" — a hinge between two halves of one phrase, and there is no
                such word here. Setting it any other way would leave the page
                disagreeing with the artwork it is painted on. */}
            <h1 className="uppercase">
                <span className="block text-[86px] leading-[1.02] font-semibold tracking-[0.02em] indent-[0.02em]">
                    Nalu
                </span>
                {/* The indent cancels the space letter-spacing leaves after the
                    final letter, which is what keeps the line optically centred
                    under the one above it. */}
                <span className="block text-[24px] leading-[1.15] font-medium tracking-[0.3em] indent-[0.3em]">
                    Escuela Holística
                </span>
            </h1>

            {/* A rule broken by the diamond the plaques are pinned with — the
                one gold on the block, and the thing that ties this lettering to
                the doorways below it. Ringed in navy because it sits on a pale
                sky, where bare gold has almost nothing to show against. */}
            <div className="mx-auto my-2 flex w-95 items-center gap-3">
                <span aria-hidden className="h-px flex-1 bg-[#0a1628]/45" />
                <span aria-hidden className="size-2 rotate-45 bg-gold ring-1 ring-[#0a1628]/40" />
                <span aria-hidden className="h-px flex-1 bg-[#0a1628]/45" />
            </div>

            <p className="indent-[0.3em] text-[14px] font-semibold tracking-[0.3em] text-[#0a1628]/85 uppercase">
                Gran Salón del Conocimiento
            </p>

            {/* Broken by hand rather than left to wrap. The block has a fixed
                width and is only ever scaled, so these three lines are the same
                three lines on every screen — and the shape of the paragraph is
                part of the composition. */}
            <p className="mt-2 text-[17px] leading-[1.4] font-semibold text-[#0a1628]/95">
                Aquí comienza tu viaje de aprendizaje.
                <br />
                Explora conocimientos, conecta con ideas
                <br />
                y despierta tu sabiduría interior.
            </p>
        </div>
    )
}
