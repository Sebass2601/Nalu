import { PageHeader } from "@/components/PageHeader";
import { AdminPurchaseTable } from "@/app/features/purchases/components/AdminPurchaseTable";
import { getAllPurchases } from "@/app/features/purchases/db/adminPurchases";
import { requireAdmin } from "@/app/features/users/actions/currentUser";

// The shop-wide version of the buyer's /purchases page: every receipt, from
// every customer, newest first.
export default async function AdminPurchasesPage() {
    // Repeated here even though the admin layout gates this subtree already:
    // layouts do not rerender on client navigation, so the page has to make its
    // own database-backed check rather than trust that the layout ran.
    await requireAdmin();

    const purchases = await getAllPurchases();

    return (
        <div className="min-h-[calc(100vh-5rem)] bg-white text-gray-900">
            <div className="container mx-auto px-6 py-6">
                <PageHeader title="Ventas" />

                {purchases.length === 0 ? (
                    <p className="text-muted-foreground">
                        Todavía no hay ninguna venta registrada.
                    </p>
                ) : (
                    <AdminPurchaseTable purchases={purchases} />
                )}
            </div>
        </div>
    );
}
