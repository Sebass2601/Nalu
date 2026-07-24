import { PageHeader } from "@/components/PageHeader";
import { db } from "@/drizzle/db";
import { CategoryTable } from "@/drizzle/schema";
import { CategoryForm } from "@/app/features/categories/components/CategoryForm";
import { getCategoryIdTag } from "@/app/features/categories/db/cache/categories";
import { eq } from "drizzle-orm";
import { cacheTag } from "next/cache";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/app/features/users/actions/currentUser";

export default async function EditCategoryPage({
    params,
}: {
    params: Promise<{ categoryId: string }>
}) {
    await requireAdmin();
    const { categoryId } = await params
    const category = await getCategory(categoryId)

    if (category == null) return notFound()

    return (
        <div className="container my-6">
            <PageHeader title={`Editar ${category.name}`} />
            <CategoryForm category={category} />
        </div>
    )
}

async function getCategory(id: string) {
    "use cache"
    cacheTag(getCategoryIdTag(id))

    return db.query.CategoryTable.findFirst({
        columns: { id: true, name: true, description: true },
        where: eq(CategoryTable.id, id),
    })
}
