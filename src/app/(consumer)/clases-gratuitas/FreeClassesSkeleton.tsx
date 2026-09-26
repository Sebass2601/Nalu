// The shape of the gallery before it has any cards in it.
//
// Its own file rather than an export from `page.tsx`, because both the page's
// <Suspense> boundary and the route's `loading.tsx` need it and a route file is
// not a place to keep shared pieces.
//
// Card-shaped, in the same grid the page uses, so the cards land where these
// stood rather than somewhere else. Three is enough to hold the band on a wide
// screen without promising a particular number of classes.
export function FreeClassesSkeleton() {
    return (
        <div className="animate-pulse grid grid-cols-[repeat(auto-fill,minmax(300px,1fr))] gap-4 lg:gap-6">
            {Array.from({ length: 3 }, (_, index) => (
                <div
                    key={index}
                    className="h-96 rounded-2xl border border-gold/20 bg-[#0a1628]/40"
                />
            ))}
        </div>
    );
}
