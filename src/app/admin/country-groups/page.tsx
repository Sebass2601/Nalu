import { PageHeader } from "@/components/PageHeader";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { getCountryGroups } from "@/app/features/countryGroups/db/countryGroups";
import { CountryGroupDiscountForm } from "@/app/features/countryGroups/components/CountryGroupDiscountForm";
import { requireAdmin } from "@/app/features/users/actions/currentUser";

export default async function CountryGroupsPage() {
    await requireAdmin();
    const countryGroups = await getCountryGroups();

    return (
        <div className="min-h-[calc(100vh-5rem)] bg-white text-gray-900">
            <div className="container mx-auto px-6 py-6">
                <PageHeader title="Paridad de Poder Adquisitivo" />
                <p className="text-sm text-gray-500 mb-6 max-w-2xl">
                    Establece el descuento recomendado para cada grupo de países.
                    Los compradores de estos países ven el precio con descuento
                    automáticamente, según su ubicación.
                </p>

                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Grupo de países</TableHead>
                            <TableHead>Países</TableHead>
                            <TableHead className="w-64">
                                Descuento recomendado
                            </TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {countryGroups.map(group => (
                            <TableRow key={group.id}>
                                <TableCell className="font-medium">
                                    {group.name}
                                </TableCell>
                                <TableCell>{group.countryCount}</TableCell>
                                <TableCell>
                                    <CountryGroupDiscountForm
                                        countryGroup={group}
                                    />
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}
