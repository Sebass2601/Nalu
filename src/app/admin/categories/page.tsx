import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { CategoryTable } from "@/app/features/categories/components/CategoryTable";
import { cacheTag } from "next/cache";
import { getCategoryGlobalTag } from "@/app/features/categories/db/cache/categories";
import { getCourseGlobalTag } from "@/app/features/courses/db/cache/courses";
import { db } from "@/drizzle/db";
import {
    CategoryTable as DbCategoryTable,
    CourseTable,
} from "@/drizzle/schema";
import { asc, countDistinct, eq } from "drizzle-orm";
import { requireAdmin } from "@/app/features/users/actions/currentUser";

export default async function CategoriesPage() {
    await requireAdmin();
    const categories = await getCategories();
    return (
        <div className="min-h-[calc(100vh-5rem)] bg-white text-gray-900">
            <div className="container mx-auto px-6 py-6">
                <PageHeader title="Categorías">
                    <Button asChild>
                        <Link href="/admin/categories/new">Nueva Categoría</Link>
                    </Button>
                </PageHeader>

                <CategoryTable categories={categories} />
            </div>
        </div>
    )
}

async function getCategories() {
    "use cache"
    cacheTag(getCategoryGlobalTag(), getCourseGlobalTag())

    return db
        .select({
            id: DbCategoryTable.id,
            name: DbCategoryTable.name,
            doorway: DbCategoryTable.doorway,
            coursesCount: countDistinct(CourseTable.id),
        })
        .from(DbCategoryTable)
        .leftJoin(CourseTable, eq(CourseTable.categoryId, DbCategoryTable.id))
        .orderBy(asc(DbCategoryTable.name))
        .groupBy(DbCategoryTable.id)
}
