import { ReaderSkeleton } from "@/components/ui/ReaderSkeleton";

// Shown the instant an announcement is chosen, until it arrives. See the free
// course's equivalent for why this is a `loading.tsx` and not the <Suspense>
// inside the page: between two announcements the page's own boundary is an update
// rather than a mount, so it never shows its fallback and the previous notice
// simply stays on screen until the new one is ready.
//
// No `media` flag: an announcement is writing with pictures set into it, so it
// opens with prose rather than with a frame waiting for a video.
export default function LoadingAnnouncement() {
    return <ReaderSkeleton />;
}
