import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { AnnouncementTable } from "@/app/features/announcements/components/AnnouncementTable";
import { getAnnouncements } from "@/app/features/announcements/db/announcements";
import { requireAdmin } from "@/app/features/users/actions/currentUser";

// The announcements the school has written, drafts and published alike.
export default async function AdminAnnouncementsPage() {
    await requireAdmin();
    const announcements = await getAnnouncements();

    return (
        <div className="min-h-[calc(100vh-5rem)] bg-white text-gray-900">
            <div className="container mx-auto px-6 py-6">
                <PageHeader title="Anuncios">
                    <Button asChild>
                        <Link href="/admin/announcements/new">
                            Nuevo Anuncio
                        </Link>
                    </Button>
                </PageHeader>

                {announcements.length === 0 ? (
                    <p className="text-muted-foreground">
                        Todavía no hay anuncios. El primero que publiques
                        aparecerá en /announcements.
                    </p>
                ) : (
                    <AnnouncementTable announcements={announcements} />
                )}
            </div>
        </div>
    );
}
