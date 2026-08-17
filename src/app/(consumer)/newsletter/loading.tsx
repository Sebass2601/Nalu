import { ReaderSkeleton } from "@/components/ui/ReaderSkeleton";

// Shown while arriving at /newsletter from elsewhere on the site.
//
// /newsletter itself has nothing to draw — it works out the newest class and
// redirects to its first section — but that decision is still a query, and
// without this the salon stays on screen until it resolves, so pressing the
// plaque appears to do nothing. This puts the reader inside the page immediately,
// with the frame and the menu already drawn around the bars.
export default function LoadingNewsletter() {
    return <ReaderSkeleton />;
}
