import { PageHeader } from "@/components/PageHeader";
import { db } from "@/drizzle/db";
import { CourseTable } from "@/drizzle/schema";
import { getCourseGlobalTag } from "@/app/features/courses/db/cache/courses";
import { ProductForm } from "@/app/features/products/components/ProductForm";
import { asc } from "drizzle-orm";
import { cacheTag } from "next/cache";
import { requireAdmin } from "@/app/features/users/actions/currentUser";

export default async function NewProductPage() {
    await requireAdmin();

    return (
        <div className="container my-6">
            <PageHeader title="Nuevo Producto" />
            <ProductForm courses={await getCourses()} />
        </div>
    )
}

async function getCourses() {
    "use cache"
    cacheTag(getCourseGlobalTag())

    return db.query.CourseTable.findMany({
        orderBy: asc(CourseTable.name),
        columns: { id: true, name: true },
    })
}
