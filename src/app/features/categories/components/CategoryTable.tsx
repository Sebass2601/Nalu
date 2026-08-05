import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { formatPlural } from "@/lib/formatters"
import { Trash2Icon } from "lucide-react"
import Link from "next/link"
import { deleteCategory } from "../actions/categories"
import { ActionButton } from "@/components/ActionButton"
import { doorwayLabel } from "@/components/ui/parallaxEntrances"

export function CategoryTable({
    categories
}: {
  categories: {
    id: string
    name: string
    coursesCount: number
    doorway: string | null
  }[]
}) {
    return <Table>
        <TableHeader>
            <TableRow>
                <TableHead>{formatPlural(categories.length, {
                    singular: "categoría", plural: "categorías"
                })}
                </TableHead>
                <TableHead>Cursos</TableHead>
                <TableHead>Puerta</TableHead>
                <TableHead>Acciones</TableHead>
            </TableRow>
        </TableHeader>
        <TableBody>
            {categories.map(category => (
                <TableRow key={category.id}>
                    <TableCell>
                        <div className="font-bold">{category.name}</div>
                    </TableCell>
                    <TableCell>
                        {formatPlural(category.coursesCount, {
                            singular: "curso",
                            plural: "cursos",
                        })}
                    </TableCell>
                    <TableCell>
                        {/* A doorway that no longer exists in the artwork falls
                            back to its bare id, so it can still be spotted and
                            reassigned instead of vanishing from this list. */}
                        {category.doorway == null ? (
                            <span className="text-muted-foreground">Sin puerta</span>
                        ) : (
                            doorwayLabel(category.doorway) ?? `Puerta ${category.doorway}`
                        )}
                    </TableCell>
                    <TableCell>
                        <div className="flex gap-2">
                            <Button asChild>
                                <Link href={`/admin/categories/${category.id}/edit`}>Editar</Link>
                            </Button>
                            <ActionButton
                            variant="destructiveOutline"
                            requireAreYouSure
                            action={deleteCategory.bind(null, category.id)}>
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
