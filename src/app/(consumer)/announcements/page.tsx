import { redirect } from "next/navigation";
import { getPublishedAnnouncements } from "@/app/features/announcements/db/announcementFeed";

// The door onto the announcements. It has nothing of its own to show: it finds the
// newest notice and sends the reader to it, so /announcements is an address that
// keeps pointing at the latest news as more is published.
//
// The list arrives newest-first from the query, so the newest one is simply the
// first — there is no rule here to get wrong.
//
// Awaited in the page itself rather than inside a <Suspense> boundary, and that
// placement is load-bearing. `redirect` reached while the response is already
// streaming can only ask the browser to redirect itself, which it does with a
// `<meta http-equiv="refresh" content="1;...">` — a full second of blank screen.
// Called before the response begins, it is a 307 and this page never renders at
// all. The list is a cached read with no request-time data behind it, so there is
// nothing forcing it to wait for a request to exist.
export default async function AnnouncementsPage() {
    const announcements = await getPublishedAnnouncements();
    const newest = announcements[0];

    // Outside any try/catch, as it must be: `redirect` works by throwing.
    if (newest != null) redirect(`/announcements/${newest.id}`);

    return <NothingPublishedYet />;
}

// Shown when nothing is published. Kept close to the words this page has always
// carried, since the situation it describes has not changed — there is simply
// nothing to read yet.
function NothingPublishedYet() {
    return (
        <div className="flex flex-col items-center gap-4 py-24 text-center">
            <h1 className="text-4xl tracking-wide text-ink-bright sm:text-5xl">
                Anuncios
            </h1>
            <p className="text-xl text-ink-body">
                No hay anuncios por ahora, ¡revisa esta página en el futuro!
            </p>
        </div>
    );
}
