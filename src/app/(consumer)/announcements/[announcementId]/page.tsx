import { Suspense } from "react";
import { notFound } from "next/navigation";
import { getPublishedAnnouncement } from "@/app/features/announcements/db/announcementFeed";
import { ProseWithImages } from "@/components/prose/ProseWithImages";
import { formatDate } from "@/lib/formatters";

// One announcement: its heading, the day it went up, and the writing with its
// pictures set into it.
//
// The body is the same component a text lesson renders through, so the two look
// identical by construction rather than by two sets of matching classes.
//
// Nothing here checks who is asking. An announcement is either published — in
// which case it is public — or it is not, in which case the query does not return
// it and this 404s. There is no locked state to draw.
//
// `params` is request-time data, so the part that reads it sits inside <Suspense>
// while the frame around it comes from the layout.
export default function AnnouncementPage({
    params,
}: PageProps<"/announcements/[announcementId]">) {
    return (
        <Suspense fallback={<AnnouncementSkeleton />}>
            <Announcement params={params} />
        </Suspense>
    );
}

async function Announcement({
    params,
}: {
    params: PageProps<"/announcements/[announcementId]">["params"];
}) {
    const { announcementId } = await params;
    const announcement = await getPublishedAnnouncement(announcementId);

    if (announcement == null) return notFound();

    return (
        <article className="flex flex-col gap-6">
            <header className="flex flex-col gap-2">
                {/* The long form of the date here — "17 de agosto de 2026" —
                    against the short dd/mm/yy in the menu. The menu's job is to
                    let you pick one of many at a glance, where a compact date
                    keeps the tabs aligned; this is the announcement itself, where
                    there is one date on the page and room to say it properly. */}
                <p className="text-sm tracking-widest text-ink-meta uppercase">
                    {formatDate(announcement.createdAt)}
                </p>
                <h1 className="text-4xl tracking-wide text-gold">
                    {announcement.name}
                </h1>
            </header>

            <ProseWithImages
                content={announcement.content}
                images={announcement.images}
            />
        </article>
    );
}

function AnnouncementSkeleton() {
    return (
        <div className="flex animate-pulse flex-col gap-6">
            <div className="h-4 w-40 rounded bg-gold/10" />
            <div className="h-9 w-80 max-w-full rounded bg-gold/20" />
            <div className="h-4 w-full rounded bg-gold/10" />
            <div className="h-4 w-5/6 rounded bg-gold/10" />
        </div>
    );
}
