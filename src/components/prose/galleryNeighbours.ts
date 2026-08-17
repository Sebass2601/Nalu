// Which images a gallery should pull over the network before the reader asks
// for them: the one after the current image and the one before it, wrapping at
// both ends exactly as the arrows do.
//
// A window of two rather than the whole gallery. Fetching everything would make
// a twenty-image lesson download twenty images to show one, and fetching
// nothing is what leaves the reader looking at a stale picture while the next
// one is still on the wire.
//
// The next image comes first in the list. Both are requested, but a reader
// works forwards through a gallery far more often than backwards, so the
// forwards one goes out first and wins the race for the connection.
export function galleryNeighbourIndexes(index: number, total: number) {
    // A gallery of one has no arrows, and a gallery of two has a single other
    // image that both arrows lead to — asking for it once per arrow would put
    // the same request on the wire twice.
    if (total < 2) return [];
    if (total === 2) return [(index + 1) % total];

    return [(index + 1) % total, (index - 1 + total) % total];
}
