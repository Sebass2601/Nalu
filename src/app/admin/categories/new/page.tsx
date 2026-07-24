import { CategoryForm } from "@/app/features/categories/components/CategoryForm";
import { requireAdmin } from "@/app/features/users/actions/currentUser";
import { PageHeader } from "@/components/PageHeader";


export default async function NewCategoryPage() {
    await requireAdmin();

    return (
        <div className="container my-6">
            <PageHeader title="Nueva Categoría"/>
            <CategoryForm/>
        </div>
    )
}
