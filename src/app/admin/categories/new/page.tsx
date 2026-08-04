import { CategoryForm } from "@/app/features/categories/components/CategoryForm";
import { getDoorwayOccupants } from "@/app/features/categories/db/categories";
import { requireAdmin } from "@/app/features/users/actions/currentUser";
import { PageHeader } from "@/components/PageHeader";


export default async function NewCategoryPage() {
    await requireAdmin();
    const occupants = await getDoorwayOccupants();

    return (
        <div className="container my-6">
            <PageHeader title="Nueva Categoría"/>
            <CategoryForm occupants={occupants}/>
        </div>
    )
}
