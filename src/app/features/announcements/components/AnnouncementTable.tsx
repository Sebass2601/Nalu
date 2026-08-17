import Link from "next/link";
import { EyeIcon, Trash2Icon } from "lucide-react";
import { ActionButton } from "@/components/ActionButton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { AnnouncementStatus } from "@/drizzle/schema";
import { formatDate, formatPlural } from "@/lib/formatters";
import { deleteAnnouncement } from "../actions/announcements";

// Display-only Spanish labels for the DB status enum (values stay in English).
const announcementStatusLabels: Record<AnnouncementStatus, string> = {
    public: "Público",
    private: "Privado",
};

// Every announcement, newest first — drafts included, which is the difference
// between this list and the one visitors see.
export function AnnouncementTable({
    announcements,
}: {
    announcements: {
        id: string;
        name: string;
        status: AnnouncementStatus;
        createdAt: Date;
    }[];
}) {
    return (
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead>
                        {formatPlural(announcements.length, {
                            singular: "anuncio",
                            plural: "anuncios",
                        })}
                    </TableHead>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Acciones</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {announcements.map(announcement => (
                    <TableRow key={announcement.id}>
                        <TableCell className="font-bold">
                            {announcement.name}
                        </TableCell>
                        {/* The full date here rather than the menu's dd/mm/yy:
                            this is a working list, and "17 de agosto de 2026"
                            is the form that answers "when was that one?"
                            without being decoded. */}
                        <TableCell>
                            {formatDate(announcement.createdAt)}
                        </TableCell>
                        <TableCell>
                            <Badge
                                variant={
                                    announcement.status === "public"
                                        ? "default"
                                        : "secondary"
                                }
                            >
                                {announcementStatusLabels[announcement.status]}
                            </Badge>
                        </TableCell>
                        <TableCell>
                            <div className="flex items-center gap-2">
                                <Button asChild size="sm" variant="outline">
                                    <Link
                                        href={`/admin/announcements/${announcement.id}/edit`}
                                    >
                                        Editar
                                    </Link>
                                </Button>

                                {/* Only for published ones: the public route
                                    404s on a draft, so offering the link would
                                    be offering a dead end. */}
                                {announcement.status === "public" && (
                                    <Button asChild size="sm" variant="outline">
                                        <Link
                                            href={`/announcements/${announcement.id}`}
                                        >
                                            <EyeIcon />
                                            <span className="sr-only">
                                                Ver anuncio
                                            </span>
                                        </Link>
                                    </Button>
                                )}

                                {/* Guarded, because this takes the pictures with
                                    it — the rows by cascade and the uploaded
                                    files with them. */}
                                <ActionButton
                                    action={deleteAnnouncement.bind(
                                        null,
                                        announcement.id
                                    )}
                                    requireAreYouSure
                                    variant="destructiveOutline"
                                    size="sm"
                                >
                                    <Trash2Icon />
                                    <span className="sr-only">
                                        Eliminar anuncio
                                    </span>
                                </ActionButton>
                            </div>
                        </TableCell>
                    </TableRow>
                ))}
            </TableBody>
        </Table>
    );
}
