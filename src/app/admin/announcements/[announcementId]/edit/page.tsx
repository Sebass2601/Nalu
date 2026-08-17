import { notFound } from "next/navigation";
import { PageHeader } from "@/components/PageHeader";
import { AnnouncementForm } from "@/app/features/announcements/components/AnnouncementForm";
import { getAnnouncement } from "@/app/features/announcements/db/announcements";
import { requireAdmin } from "@/app/features/users/actions/currentUser";

// Editing an announcement: its words, whether it is published, and its pictures.
//
// Reads through the admin query rather than the public one, so a draft opens here
// exactly like a published notice — the whole point of a draft being that it can be
// worked on before anyone can see it.
export default async function EditAnnouncementPage({
    params,
}: {
    params: Promise<{ announcementId: string }>;
}) {
    await requireAdmin();
    const { announcementId } = await params;
    const announcement = await getAnnouncement(announcementId);

    if (announcement == null) return notFound();

    return (
        <div className="container my-6">
            <PageHeader title={`Editar ${announcement.name}`} />
            <AnnouncementForm announcement={announcement} />
        </div>
    );
}
