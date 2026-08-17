"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { Megaphone } from "lucide-react";
import { useSideMenu } from "@/components/ui/SideMenuFrame";

// One tab in the menu. The date arrives already formatted, as a string: it is
// written on the server so that every reader sees the same day regardless of where
// their computer thinks it is, and so this component has no date handling in it at
// all.
export type NavAnnouncement = {
    id: string;
    name: string;
    publishedOn: string;
};

// The list of announcements, newest at the top.
//
// One level deep, unlike the free course's menu: a course has classes with
// sections inside them, and an announcement is a single piece of writing with
// nothing under it. So there is nothing to expand — every tab is a link, and
// pressing one opens it.
//
// A client component for the same reason the course menu is one: the id of the
// announcement being read is in the URL of the *page*, and this is rendered from
// the layout above it, where that cannot be seen. `useParams` can see it.
export function AnnouncementNav({
    announcements,
}: {
    announcements: NavAnnouncement[];
}) {
    const params = useParams();
    const currentId =
        typeof params.announcementId === "string"
            ? params.announcementId
            : null;

    // Closing the panel on a phone is the frame's business; this only reports
    // that a tab was used.
    const { onNavigate } = useSideMenu();

    return (
        <nav aria-label="Anuncios" className="flex flex-col">
            <p className="mb-4 text-xl tracking-wide text-ink-bright">
                Anuncios
            </p>

            {announcements.length === 0 ? (
                <p className="font-sans text-sm leading-relaxed tracking-normal text-ink-meta">
                    Aún no hay anuncios publicados.
                </p>
            ) : (
                <ul className="flex flex-col">
                    {announcements.map(announcement => {
                        const isCurrent = announcement.id === currentId;

                        return (
                            <li
                                key={announcement.id}
                                className="border-t border-gold/20 py-1 first:border-t-0"
                            >
                                <Link
                                    href={`/announcements/${announcement.id}`}
                                    onClick={onNavigate}
                                    // Marked to a screen reader as well as to
                                    // the eye: colour alone is not an answer to
                                    // "which one am I on".
                                    aria-current={
                                        isCurrent ? "page" : undefined
                                    }
                                    // The announcement being read is filled with
                                    // gold and its name goes pure white, the same
                                    // mark the free course's menu uses for the
                                    // class you are inside — so the two menus
                                    // read the same way.
                                    //
                                    // Gold over the navy rather than solid gold:
                                    // white on solid gold is barely readable, and
                                    // the name is the part that has to be read.
                                    className={`flex items-start gap-2 rounded-lg px-2 py-1.5 text-base transition-colors ${
                                        isCurrent
                                            ? "border-l-2 border-gold bg-gold/25 text-white"
                                            : "text-ink-body hover:bg-gold/10 hover:text-ink-bright"
                                    }`}
                                >
                                    <Megaphone
                                        aria-hidden
                                        className="mt-1 size-3.5 shrink-0 text-ink-meta"
                                    />
                                    {/* Name above, date below, rather than the
                                        two on one line. A title long enough to
                                        wrap would otherwise push the date onto a
                                        line of its own anyway, and only
                                        sometimes — which reads as two different
                                        kinds of tab. Stacked, every tab has the
                                        same shape. */}
                                    <span className="flex min-w-0 flex-col">
                                        <span>{announcement.name}</span>
                                        <span
                                            className={`font-sans text-xs tracking-normal ${
                                                isCurrent
                                                    ? "text-white/70"
                                                    : "text-ink-meta"
                                            }`}
                                        >
                                            {announcement.publishedOn}
                                        </span>
                                    </span>
                                </Link>
                            </li>
                        );
                    })}
                </ul>
            )}
        </nav>
    );
}
