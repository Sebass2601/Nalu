// The shape of the gallery before it has any cards in it.
//
// Its own file rather than an export from `page.tsx`, because both the page's
// <Suspense> boundary and the route's `loading.tsx` need it and a route file is
// not a place to keep shared pieces.
//
// Card-shaped, and in both layouts, so the page does not change shape as it
// resolves. Three is enough to hold the band on a wide screen without promising
// a particular number of classes.
export function FreeClassesSkeleton() {
    return (
        <div className="animate-pulse">
            <div className="lg:hidden">
                <div className="h-96 w-[85vw] max-w-125 rounded-2xl border border-gold/20 bg-[#0a1628]/40" />
            </div>

            <div className="hidden grid-cols-[repeat(auto-fill,minmax(300px,1fr))] gap-6 lg:grid">
                {Array.from({ length: 3 }, (_, index) => (
                    <div
                        key={index}
                        className="h-96 rounded-2xl border border-gold/20 bg-[#0a1628]/40"
                    />
                ))}
            </div>
        </div>
    );
}
