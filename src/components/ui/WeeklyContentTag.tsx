// The mark on a course that is still being written: material goes up week by
// week rather than the whole thing being finished on the day it is bought.
//
// The site's own blue with gold lettering and a gold edge — the same three
// ingredients as the navbar plaques, so it reads as part of the building rather
// than a sticker applied to it.
//
// `#12243f` is the blue at the top of every page's wash, and it is deliberately a
// step lighter than the `#0a1628` of the cards. The tag has to hold up in two
// places: over a cover photograph, where almost anything would, and beside a
// course name on the card itself, where a fill matching the card would leave only
// the outline doing the work.
//
// Solid rather than translucent, for the same reason: over a bright picture a
// see-through fill lets the artwork through and the gold letters lose their
// ground.
//
// Positioned by the caller, not here. Every card places it in the lower-right of
// its cover, but each of them builds that cover differently, so the tag stays a
// plain inline-block and each card says where it goes.
export function WeeklyContentTag({ className = "" }: { className?: string }) {
    return (
        <span
            // `shrink-0` and `whitespace-nowrap` together: the phrase is two
            // words and must break in neither of them. It is short enough at
            // this size to fit the narrowest card, and a tag broken across two
            // lines reads as two tags.
            className={`inline-block shrink-0 rounded-md border border-gold bg-[#12243f] px-2 py-1 text-[10px] leading-none tracking-widest whitespace-nowrap text-gold uppercase shadow-[0_2px_8px_rgba(4,9,18,0.6)] sm:text-xs ${className}`}
        >
            Contenido semanal
        </span>
    );
}
