import { ReaderSkeleton } from "@/components/ui/ReaderSkeleton";

// Shown while arriving at /announcements from elsewhere on the site — the same
// job as the free course's: the page redirects to the newest notice, and this is
// what stands in while it works out which that is.
export default function LoadingAnnouncements() {
    return <ReaderSkeleton />;
}
