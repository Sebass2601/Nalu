import { CourseForm } from "@/app/features/courses/components/CourseForm";
import { getCategoryGlobalTag } from "@/app/features/categories/db/cache/categories";
import { requireAdmin } from "@/app/features/users/actions/currentUser";
import { PageHeader } from "@/components/PageHeader";
import { db } from "@/drizzle/db";
import { CategoryTable } from "@/drizzle/schema";
import { asc } from "drizzle-orm";
import { cacheTag } from "next/cache";


export default async function NewCoursePage() {
    await requireAdmin();

    return (
        <div className="container my-6">
            <PageHeader title="Nuevo Curso"/>
            <CourseForm categories={await getCategories()} />
        </div>
    )
}

async function getCategories() {
    "use cache"
    cacheTag(getCategoryGlobalTag())

    return db.query.CategoryTable.findMany({
        orderBy: asc(CategoryTable.name),
        columns: { id: true, name: true },
    })
}
