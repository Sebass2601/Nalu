import { Suspense } from "react";
import { cinzel } from "@/components/ui/fonts";
import { CarvedBackdrop } from "@/components/ui/CarvedBackdrop";
import { SideMenuFrame } from "@/components/ui/SideMenuFrame";
import { AnnouncementNav } from "@/app/features/announcements/components/AnnouncementNav";
import { getPublishedAnnouncements } from "@/app/features/announcements/db/announcementFeed";
import { formatShortDate } from "@/lib/formatters";

// The frame shared by every announcement: the list of notices down the left,
// whichever one is open beside it.
//
// The same frame /newsletter uses, with a different panel inside it. Being a
// layout is what makes the panel survive moving between announcements — a layout
// is not re-rendered when you navigate between its own pages, so the menu stays
// open and stays scrolled where it was.
//
// Nothing is awaited here: the background and the columns are the same for every
// announcement, so they are drawn at once, and the two things that need data — the
// list and the announcement itself — arrive behind their own boundaries.
export default function AnnouncementsLayout({
    children,
}: LayoutProps<"/announcements">) {
    return (
        // No background of its own — see /sobre-nosotros and /newsletter, which
        // are hosted the same way. CarvedBackdrop paints at `-z-10`, so an opaque
        // colour on this element would be painted over it and hide it; the canvas
        // navy comes from <body> instead, where an overscroll bounce can find it.
        <main className={`${cinzel.className} relative min-h-screen w-full`}>
            <CarvedBackdrop />

            <SideMenuFrame
                menuLabel="Anuncios"
                menu={
                    <Suspense fallback={<MenuSkeleton />}>
                        <AnnouncementMenu />
                    </Suspense>
                }
            >
                {children}
            </SideMenuFrame>
        </main>
    );
}

// The list of published announcements, fetched once for the whole route.
//
// The date is formatted HERE, on the server, and handed down as a finished string.
// Formatting it in the browser would read the visitor's own clock and timezone —
// two readers would see two different days for the same announcement, and the
// server's first render would disagree with the browser's second one.
async function AnnouncementMenu() {
    const announcements = await getPublishedAnnouncements();

    return (
        <AnnouncementNav
            announcements={announcements.map(({ id, name, createdAt }) => ({
                id,
                name,
                publishedOn: formatShortDate(createdAt),
            }))}
        />
    );
}

function MenuSkeleton() {
    return (
        <div className="animate-pulse">
            <div className="mb-4 h-6 w-32 rounded bg-gold/20" />
            <div className="flex flex-col gap-4">
                {Array.from({ length: 4 }, (_, index) => (
                    <div key={index} className="flex flex-col gap-1.5">
                        <div className="h-4 w-full rounded bg-gold/10" />
                        <div className="h-3 w-16 rounded bg-gold/10" />
                    </div>
                ))}
            </div>
        </div>
    );
}
