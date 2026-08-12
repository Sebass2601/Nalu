import Link from "next/link";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    getCourseAccessList,
    getCourseForAccess,
} from "@/app/features/courses/db/adminCourseAccess";
import { CourseAccessTable } from "@/app/features/courses/components/CourseAccessTable";
import { AddCourseAccessForm } from "@/app/features/courses/components/AddCourseAccessForm";
import { requireAdmin } from "@/app/features/users/actions/currentUser";

// Managing one course's access list: who has it, and a box to add somebody.
export default async function CourseAccessPage({
    params,
}: {
    params: Promise<{ courseId: string }>;
}) {
    await requireAdmin();

    return (
        <div className="min-h-[calc(100vh-5rem)] bg-white text-gray-900">
            <div className="container mx-auto px-6 py-6">
                <Suspense fallback={<div>Cargando...</div>}>
                    <CourseAccessContent params={params} />
                </Suspense>
            </div>
        </div>
    );
}

async function CourseAccessContent({
    params,
}: {
    params: Promise<{ courseId: string }>;
}) {
    const { courseId } = await params;

    const course = await getCourseForAccess(courseId);

    if (course == null) return notFound();

    const entries = await getCourseAccessList(courseId);

    return (
        <>
            <PageHeader title={course.name}>
                <Button asChild variant="outline">
                    <Link href="/admin/access">Volver</Link>
                </Button>
            </PageHeader>

            {course.includedInSubscription && (
                <div className="mb-6 rounded-md border border-border bg-muted/40 p-4 text-sm">
                    <Badge variant="secondary" className="mb-2">
                        Incluido en la suscripción
                    </Badge>
                    {/* Said plainly because the list below would otherwise read
                        as the complete answer to "who can watch this?", and for
                        this course it is not. Subscriber access is worked out
                        when the page is opened and never stored, so there is no
                        row here to show or remove. */}
                    <p className="text-muted-foreground">
                        Además de las cuentas de abajo, cualquier persona con
                        una suscripción activa puede ver este curso. Ese acceso
                        no aparece en esta lista y se controla desde el curso,
                        quitándolo de la suscripción.
                    </p>
                </div>
            )}

            <AddCourseAccessForm courseId={course.id} />

            <div className="mt-8">
                <CourseAccessTable courseId={course.id} entries={entries} />
            </div>
        </>
    );
}
