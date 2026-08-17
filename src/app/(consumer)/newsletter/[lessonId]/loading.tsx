import { ReaderSkeleton } from "@/components/ui/ReaderSkeleton";

// Shown the instant a section is chosen, until it arrives.
//
// This has to be a `loading.tsx` rather than the <Suspense> already inside the
// page. That boundary works on a page load, but not when moving from one section
// to another: the boundary exists in the tree being replaced as well as the new
// one, so React treats the change as an update and keeps the previous section on
// screen — measured as no feedback at all for the whole of a slow load, then a
// sudden swap. A `loading.tsx` is a boundary the router resets per segment, which
// is what makes it appear immediately.
//
// The menu, the background and the corner buttons come from the layout above and
// stay put, so only the column being replaced is drawn as bars — and the menu
// stays usable while the next section loads.
export default function LoadingFreeLesson() {
    return <ReaderSkeleton />;
}
