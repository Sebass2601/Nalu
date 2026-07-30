import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RefundButton } from "./RefundButton";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { formatDate, formatPlural, formatPrice } from "@/lib/formatters";
import type { AdminPurchase } from "../db/adminPurchases";

// The sales log: every purchase ever made, by anyone.
//
// A table rather than the cards used on the buyer's own page. The buyer reads
// their handful of rows one at a time; an admin scans a column — down the
// amounts, down the dates, down the refunds — and a table is what puts those
// underneath each other.
export function AdminPurchaseTable({
    purchases,
}: {
    purchases: AdminPurchase[];
}) {
    return (
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead>
                        {formatPlural(purchases.length, {
                            singular: "venta",
                            plural: "ventas",
                        })}
                    </TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Importe</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Acciones</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {purchases.map(purchase => (
                    <TableRow key={purchase.id}>
                        <TableCell>
                            <div className="flex items-center gap-4">
                                {/* Plain <img> instead of next/image, as in the
                                    product table: this URL was snapshotted at
                                    the moment of sale and may point at a host
                                    that is no longer whitelisted in
                                    next.config. */}
                                <img
                                    className="object-cover rounded size-12"
                                    src={purchase.productImageUrl}
                                    alt=""
                                />
                                <div className="flex flex-col gap-1">
                                    <div className="font-semibold">
                                        {purchase.productName}
                                    </div>
                                    {/* The date lives under the product rather
                                        than in a column of its own: the list is
                                        already sorted by it, so it reads as a
                                        label on the row instead of a value to
                                        compare across rows. */}
                                    <div className="text-muted-foreground">
                                        {formatDate(purchase.purchasedAt)}
                                    </div>
                                </div>
                            </div>
                        </TableCell>
                        <TableCell>{purchase.customerName}</TableCell>
                        {/* What was actually charged, shown on refunded rows
                            too. The amount that left the customer's account is
                            the fact the row records; whether it later came back
                            is the next column's job. */}
                        <TableCell>
                            {formatPrice(purchase.pricePaidInCents / 100)}
                        </TableCell>
                        <TableCell>
                            {purchase.refundedAt == null ? (
                                <Badge variant="secondary">Pagada</Badge>
                            ) : (
                                <Badge variant="destructive">Reembolsada</Badge>
                            )}
                        </TableCell>
                        <TableCell>
                            <div className="flex gap-2">
                                <Button variant="outline" asChild>
                                    <Link
                                        href={`/admin/purchases/${purchase.id}`}
                                    >
                                        Ver recibo
                                    </Link>
                                </Button>

                                {/* Hidden once there is nothing left to
                                    refund — an already-reversed sale, or a
                                    free one where no money ever moved. The
                                    action re-checks both; this only keeps a
                                    button that would always fail off the
                                    screen. */}
                                {purchase.refundedAt == null &&
                                    purchase.pricePaidInCents > 0 && (
                                        <RefundButton
                                            purchaseId={purchase.id}
                                        />
                                    )}
                            </div>
                        </TableCell>
                    </TableRow>
                ))}
            </TableBody>
        </Table>
    );
}
