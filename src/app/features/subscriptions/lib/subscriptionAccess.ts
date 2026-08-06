// Whether a subscription row still grants access at a given moment.
//
// This lives apart from the query that fetches the row, and that separation is
// the point. The query is cached; this is not. Asking "is it still valid?"
// inside a `"use cache"` scope freezes the answer at the moment the cache entry
// was filled, so a subscription that lapses afterwards keeps granting access
// until something happens to regenerate the entry — which, with the default
// cache profile, can be a quarter of an hour after the fact and only ever
// happens on a read.
//
// `now` is a parameter rather than a `new Date()` inside, so the rule can be
// tested at a chosen instant instead of only at the one the test runs.
export function subscriptionGrantsAccess(
    subscription: { currentPeriodEnd: Date } | null | undefined,
    now: Date = new Date()
) {
    if (subscription == null) return false;

    return subscription.currentPeriodEnd > now;
}
