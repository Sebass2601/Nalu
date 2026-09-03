// The arithmetic behind `DraggableStrip`, kept apart from it.
//
// The strip reads these numbers off the DOM along whichever axis it runs — x
// when it is a row, y when it is a column — and the whole point of pulling the
// sums out here is that none of them care which. `offset`, `viewport` and
// `step` are distances along the strip's own axis, and that is all they need to
// be. It is also what makes them testable: the strip itself cannot be, without
// a browser to measure.

// Round a scroll offset onto the nearest card boundary.
//
// `origin` is the offset at which the first card sits flush against the strip's
// leading edge — not zero, because the strip is padded, and guessing it wrong
// leaves scroll-snap a few pixels to correct after every move.
//
// Rounding to the grid rather than adding to wherever we are is what stops a
// half-card offset, left behind by a drag, being carried along forever.
//
// A `step` of zero means nothing has been measured yet — one card, or none.
// There is no grid to snap to, so the offset is returned untouched rather than
// divided by zero.
export function snapToCardGrid(offset: number, origin: number, step: number) {
    if (step <= 0) return offset;
    return origin + Math.round((offset - origin) / step) * step;
}

// How far one press of an arrow travels: as many whole cards as fit in view.
//
// Paging by the raw viewport length instead would stop partway through a card
// and leave `snap-mandatory` to drag it into place afterwards — one smooth
// movement followed by a jerk.
//
// At least one card, always. A card wider (or taller) than the strip itself
// would otherwise round down to zero cards per page and the arrows would do
// nothing at all.
export function pageDistance(viewport: number, step: number) {
    if (step <= 0) return viewport;
    return Math.max(1, Math.floor(viewport / step)) * step;
}

// How far to jump to bring a looping strip back onto its middle copy.
//
// A looping strip is three copies of the same cards laid end to end, with the
// real one in the middle, so the resting range is `[period, 2 * period)`. Land
// outside it and moving by exactly one period puts you back at the same visual
// position on the middle copy: nothing moves on screen, only the number
// changes.
//
// Returns the delta rather than the new offset, because a drag in progress is
// holding a scroll position from before the jump and has to be corrected by the
// same amount.
//
// A `period` of zero means there are no clones — the strip does not loop, or
// nothing overflows — and a strip with a real end must never be wrapped.
export function wrapOntoMiddleCopy(offset: number, period: number) {
    if (period <= 0) return 0;
    if (offset >= period * 2) return -period;
    if (offset < period) return period;
    return 0;
}
