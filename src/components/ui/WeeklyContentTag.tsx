// The mark on a course that is still being written: material goes up week by
// week rather than the whole thing being finished on the day it is bought.
//
// Blue, which is the one thing on these cards that is neither navy nor gold. The
// site spends gold on what you press and ink on what you read, so a gold tag
// would read as a button and an ink one would disappear into the card. Blue is
// outside both scales, which is what makes it register as a label — and the gold
// outline is what keeps it inside the house style rather than looking like a
// sticker from somewhere else.
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
            className={`inline-block shrink-0 rounded-md border border-gold bg-[#1d4ed8] px-2 py-1 text-[10px] leading-none tracking-widest whitespace-nowrap text-white uppercase shadow-[0_2px_8px_rgba(4,9,18,0.6)] sm:text-xs ${className}`}
        >
            Contenido semanal
        </span>
    );
}
