export function formatPlural(
    count: number,
    { singular, plural }: {singular: string; plural: string },
    { includeCount = true } = {}
)   {
    const word = count === 1 ? singular : plural

    return includeCount ? `${count} ${word}` : word
}

// Long-form Spanish dates — "12 de marzo de 2026".
//
// The locale is pinned to "es" rather than left to the runtime, because the
// server formats these and its locale has nothing to do with the reader's. The
// site is Spanish, so the dates are too.
export function formatDate(date: Date) {
    return date.toLocaleDateString("es", {
        day: "numeric",
        month: "long",
        year: "numeric",
    })
}

// The timezone every date on this site is read in. The school is in Panama, so
// "the 17th" means the 17th there — not on whatever machine happens to be
// rendering the page.
//
// Panama does not observe daylight saving, so this is a fixed -05:00 all year.
// Named rather than written as an offset anyway, because a zone name is what
// `Intl` understands and what a reader of this line recognises.
const SITE_TIME_ZONE = "America/Panama";

// Short numeric dates — "17/08/26". Used where a date sits beside something else
// and has to stay out of its way: the announcement tabs in the lateral menu,
// where the name is the thing being read and the date is only there to place it.
//
// Day first, then month, then a two-digit year, all zero-padded, which is both
// the Spanish convention and what makes a column of them line up.
//
// Formatted through `Intl` in a fixed zone rather than from the date's UTC parts.
// An announcement published at eight in the evening in Panama is already tomorrow
// in UTC, and reading it off `getUTCDate` would print a day that had not started
// yet. `en-GB` is a deliberate choice of *number format*, not of language: it
// gives dd/mm/yy with no words in it, so nothing about it is in the wrong
// language.
export function formatShortDate(date: Date) {
    return new Intl.DateTimeFormat("en-GB", {
        timeZone: SITE_TIME_ZONE,
        day: "2-digit",
        month: "2-digit",
        year: "2-digit",
    }).format(date);
}

export function formatPrice(amount: number, { showZeroAsNumber = false } = {}) {
    const formatter = new Intl.NumberFormat(undefined, {
        style: "currency",
        currency: "USD",
        minimumFractionDigits: Number.isInteger(amount) ? 0 : 2,
    })

    if (amount === 0 && !showZeroAsNumber) return "Gratis"
    return formatter.format(amount)
}