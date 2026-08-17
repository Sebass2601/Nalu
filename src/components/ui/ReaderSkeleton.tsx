// The shape of something being read, before it arrives: the small line above the
// title, the title, and the body under it.
//
// Shared by the two reading pages — a section of the free course and an
// announcement — because they are the same page in outline: a line of meta, a
// gold heading, then a body. The frame around it (background, the menu, the
// corner buttons) comes from the layout and is already on screen, so this only
// ever stands in for the column.
//
// Lines rather than a video frame, even though a section of the free course may
// hold a video. The shape has to be chosen before the section is known, and a
// 9:16 frame is a tall, empty guess that is wrong for every text section — while
// a few lines are close enough for both and never leave a hole in the page.
//
// It is deliberately the same shape as the real thing rather than a spinner. A
// spinner says "wait"; a skeleton in the right proportions says what is coming
// and stops the page from jumping when it does.
//
// Widths are uneven on purpose. A stack of equal bars reads as a graphic; lines
// that stop at different places read as text.
//
// The bars are pitched a step brighter than the ones elsewhere in the app, which
// were drawn against the flat navy wash. These sit on the carved wall, where a
// 10%-gold bar disappears into the ring lattice behind it.
export function ReaderSkeleton() {
    return (
        // `aria-hidden` with a live label alongside it: the bars mean nothing to
        // a screen reader, which should hear that something is loading instead of
        // a description of grey rectangles.
        <div className="flex flex-col gap-6">
            <span className="sr-only" role="status">
                Cargando…
            </span>

            <div aria-hidden className="flex animate-pulse flex-col gap-6">
                <div className="flex flex-col gap-3">
                    {/* The meta line: the class name, or the date. */}
                    <div className="h-4 w-40 rounded bg-gold/15" />
                    {/* The title, in the heavier gold of a heading. */}
                    <div className="h-9 w-80 max-w-full rounded bg-gold/25" />
                </div>

                <div className="flex flex-col gap-3">
                    <div className="h-4 w-full rounded bg-gold/15" />
                    <div className="h-4 w-11/12 rounded bg-gold/15" />
                    <div className="h-4 w-4/5 rounded bg-gold/15" />
                </div>

                <div className="flex flex-col gap-3">
                    <div className="h-4 w-full rounded bg-gold/15" />
                    <div className="h-4 w-10/12 rounded bg-gold/15" />
                    <div className="h-4 w-9/12 rounded bg-gold/15" />
                </div>
            </div>
        </div>
    );
}
