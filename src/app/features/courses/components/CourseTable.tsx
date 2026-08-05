import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { formatPlural } from "@/lib/formatters"
import { Trash2Icon } from "lucide-react"
import Link from "next/link"
import { deleteCourse } from "../actions/courses"
import { ActionButton } from "@/components/ActionButton"

export function CourseTable({
    courses
}: {
  courses: {
    id: string
    name: string
    sectionsCount: number
    lessonsCount: number
    studentsCount: number
  }[]
}) {
    return <Table>
        <TableHeader>
            <TableRow>
                <TableHead>{formatPlural(courses.length, {
                    singular: "curso", plural: "cursos"
                })}
                </TableHead>
                <TableHead>Estudiantes</TableHead>
                <TableHead>Acciones</TableHead>
            </TableRow>
        </TableHeader>
        <TableBody>
            {courses.map(course => (
                <TableRow key={course.id}>
                    <TableCell>
                        <div className="flex flex-col gap-1">
                            <div className="font-bold">{course.name}</div>
                            <div className="text-muted-foreground">
                                {formatPlural(course.sectionsCount, {
                                    singular: "clase",
                                    plural: "clases",
                                })}
                                {" "}•{" "}
                                {formatPlural(course.lessonsCount, {
                                    singular: "sección",
                                    plural: "secciones",
                                })}
                            </div>
                        </div>
                    </TableCell>
                    <TableCell>{course.studentsCount}</TableCell>
                    <TableCell>
                        <div className="flex gap-2">
                            <Button asChild>
                                <Link href={`/admin/courses/${course.id}/edit`}>Editar</Link>
                            </Button>
                            <ActionButton
                            variant="destructiveOutline" 
                            requireAreYouSure
                            action={deleteCourse.bind(null, course.id)}>
                                <Trash2Icon />
                                <span className="sr-only">Eliminar</span>
                            </ActionButton>
                        </div>
                    </TableCell>
                </TableRow>
            ))}
        </TableBody>
    </Table>
}