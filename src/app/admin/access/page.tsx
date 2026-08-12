import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { formatPlural } from "@/lib/formatters";
import { getCoursesWithAccessCounts } from "@/app/features/courses/db/adminCourseAccess";
import { requireAdmin } from "@/app/features/users/actions/currentUser";

// The way in to granting access by hand: every course, and how many accounts
// currently hold a row for it.
export default async function AdminAccessPage() {
    // Repeated even though the admin layout gates this subtree, for the reason
    // the other admin pages give: layouts do not rerender on client navigation,
    // so each page makes its own database-backed check.
    await requireAdmin();

    const courses = await getCoursesWithAccessCounts();

    return (
        <div className="min-h-[calc(100vh-5rem)] bg-white text-gray-900">
            <div className="container mx-auto px-6 py-6">
                <PageHeader title="Accesos" />

                <p className="text-muted-foreground mb-6 max-w-3xl text-sm">
                    Aquí puedes dar acceso a un curso sin que haya una compra de
                    por medio. Los accesos que vienen de una compra aparecen en
                    la lista pero no se pueden retirar desde aquí: para eso hay
                    que reembolsar la venta.
                </p>

                {courses.length === 0 ? (
                    <p className="text-muted-foreground">
                        Todavía no hay ningún curso.
                    </p>
                ) : (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>
                                    {formatPlural(courses.length, {
                                        singular: "curso",
                                        plural: "cursos",
                                    })}
                                </TableHead>
                                <TableHead>Con acceso</TableHead>
                                <TableHead>Acciones</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {courses.map(course => (
                                <TableRow key={course.id}>
                                    <TableCell>
                                        <div className="flex flex-col gap-1">
                                            <div className="font-bold">
                                                {course.name}
                                            </div>
                                            {course.includedInSubscription && (
                                                <div>
                                                    <Badge variant="secondary">
                                                        Incluido en la
                                                        suscripción
                                                    </Badge>
                                                </div>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        {formatPlural(course.accessCount, {
                                            singular: "cuenta",
                                            plural: "cuentas",
                                        })}
                                    </TableCell>
                                    <TableCell>
                                        <Button asChild>
                                            <Link
                                                href={`/admin/access/${course.id}`}
                                            >
                                                Gestionar
                                            </Link>
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                )}
            </div>
        </div>
    );
}
