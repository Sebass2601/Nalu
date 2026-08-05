import { ActionButton } from "@/components/ActionButton"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { productStatus } from "@/drizzle/schema"
import { formatPlural, formatPrice } from "@/lib/formatters"
import { EyeIcon, LockIcon, Trash2Icon } from "lucide-react"
import Link from "next/link"
import { deleteProduct } from "../actions/products"

// Display-only Spanish labels for the DB status enum (values stay in English).
const productStatusLabels: Record<productStatus, string> = {
    public: "Público",
    private: "Privado",
}

export function ProductTable({
    products,
}: {
    products: {
        id: string
        name: string
        imageUrl: string
        priceInDollars: number
        status: productStatus
        coursesCount: number
        customersCount: number
    }[]
}) {
    return (
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead>
                        {formatPlural(products.length, {
                            singular: "producto",
                            plural: "productos",
                        })}
                    </TableHead>
                    <TableHead>Clientes</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Acciones</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {products.map(product => (
                    <TableRow key={product.id}>
                        <TableCell>
                            <div className="flex items-center gap-4">
                                {/* Plain <img> instead of next/image: product images can
                                    live on arbitrary external hosts, and next/image would
                                    require whitelisting each host in next.config. */}
                                <img
                                    className="object-cover rounded size-12"
                                    src={product.imageUrl}
                                    alt={product.name}
                                />
                                <div className="flex flex-col gap-1">
                                    <div className="font-bold">{product.name}</div>
                                    <div className="text-muted-foreground">
                                        {formatPlural(product.coursesCount, {
                                            singular: "curso",
                                            plural: "cursos",
                                        })}
                                        {" "}•{" "}
                                        {formatPrice(product.priceInDollars)}
                                    </div>
                                </div>
                            </div>
                        </TableCell>
                        <TableCell>{product.customersCount}</TableCell>
                        <TableCell>
                            <Badge variant={product.status === "public" ? "default" : "secondary"}>
                                {getStatusIcon(product.status)} {productStatusLabels[product.status]}
                            </Badge>
                        </TableCell>
                        <TableCell>
                            <div className="flex gap-2">
                                <Button asChild>
                                    <Link href={`/admin/products/${product.id}/edit`}>Editar</Link>
                                </Button>
                                <ActionButton
                                    variant="destructiveOutline"
                                    requireAreYouSure
                                    action={deleteProduct.bind(null, product.id)}
                                >
                                    <Trash2Icon />
                                    <span className="sr-only">Eliminar</span>
                                </ActionButton>
                            </div>
                        </TableCell>
                    </TableRow>
                ))}
            </TableBody>
        </Table>
    )
}

function getStatusIcon(status: productStatus) {
    const Icon = {
        public: EyeIcon,
        private: LockIcon,
    }[status]

    return <Icon className="size-4" />
}
