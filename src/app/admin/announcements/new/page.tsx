import { PageHeader } from "@/components/PageHeader";
import { AnnouncementForm } from "@/app/features/announcements/components/AnnouncementForm";
import { requireAdmin } from "@/app/features/users/actions/currentUser";

// Writing a new announcement. Saving lands on the edit screen for the row that was
// just created, which is where its pictures can be attached — they need an id to
// belong to, and until the save there isn't one.
export default async function NewAnnouncementPage() {
    await requireAdmin();

    return (
        <div className="container my-6">
            <PageHeader title="Nuevo Anuncio" />
            <AnnouncementForm />
        </div>
    );
}
