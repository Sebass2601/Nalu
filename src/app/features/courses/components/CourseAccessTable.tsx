import { Trash2Icon } from "lucide-react";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ActionButton } from "@/components/ActionButton";
import { formatDate, formatPlural } from "@/lib/formatters";
import { revokeCourseAccess } from "../actions/courseAccess";
import { originIsRevocable } from "../lib/courseAccessGrant";
import type { CourseAccessEntry } from "../db/adminCourseAccess";

// Who currently holds a row for one course.
//
// The origin column carries the weight here. A row that came from a purchase
// shows what it is and offers no way to remove it — the button is not disabled
// but absent, because a disabled button invites a second click and a hunt for
// why it does nothing, while a dash reads as "not a thing you do here". The
// Server Action refuses those rows too; this is the half of the rule that
// explains it rather than the half that enforces it.
export function CourseAccessTable({
    courseId,
    entries,
}: {
    courseId: string;
    entries: CourseAccessEntry[];
}) {
    if (entries.length === 0) {
        return (
            <p className="text-muted-foreground">
                Todavía no hay ninguna cuenta con acceso a este curso.
            </p>
        );
    }

    return (
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead>
                        {formatPlural(entries.length, {
                            singular: "cuenta",
                            plural: "cuentas",
                        })}
                    </TableHead>
                    <TableHead>Origen</TableHead>
                    <TableHead>Desde</TableHead>
                    <TableHead>Acciones</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {entries.map(entry => (
                    <TableRow key={entry.userId}>
                        <TableCell>
                            <div className="flex flex-col gap-1">
                                <div className="font-bold">{entry.name}</div>
                                <div className="text-muted-foreground">
                                    {entry.email}
                                </div>
                            </div>
                        </TableCell>
                        <TableCell>
                            {entry.origin === "purchase" ? (
                                <Badge variant="outline">Compra</Badge>
                            ) : (
                                <Badge variant="secondary">Manual</Badge>
                            )}
                        </TableCell>
                        <TableCell>{formatDate(entry.grantedAt)}</TableCell>
                        <TableCell>
                            {originIsRevocable(entry.origin) ? (
                                <ActionButton
                                    variant="destructiveOutline"
                                    requireAreYouSure
                                    action={revokeCourseAccess.bind(null, {
                                        courseId,
                                        userId: entry.userId,
                                    })}
                                >
                                    <Trash2Icon />
                                    <span className="sr-only">
                                        Quitar acceso
                                    </span>
                                </ActionButton>
                            ) : (
                                <span
                                    className="text-muted-foreground text-sm"
                                    title="El acceso de una compra solo se quita reembolsando la venta"
                                >
                                    —
                                </span>
                            )}
                        </TableCell>
                    </TableRow>
                ))}
            </TableBody>
        </Table>
    );
}
