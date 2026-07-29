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

export function formatPrice(amount: number, { showZeroAsNumber = false } = {}) {
    const formatter = new Intl.NumberFormat(undefined, {
        style: "currency",
        currency: "USD",
        minimumFractionDigits: Number.isInteger(amount) ? 0 : 2,
    })

    if (amount === 0 && !showZeroAsNumber) return "Gratis"
    return formatter.format(amount)
}