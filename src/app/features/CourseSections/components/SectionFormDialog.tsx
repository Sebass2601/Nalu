"use client"

import { CourseSectionStatus } from "@/drizzle/schema";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ReactNode, useState } from "react"
import { SectionForm } from "./SectionForm";

export function SectionFormDialog({
    courseId,
    section,
    children,
} : {
    courseId: string
    children: ReactNode
    section?: { id: string; name: string; status: CourseSectionStatus }
}) {
    const [isOpen, setIsOpen] = useState(false);
    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            {children}
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{section == null ? "Nueva Sección" : `Editar ${section.name}`}</DialogTitle>
                </DialogHeader>
                <SectionForm section={section} courseId={courseId} onSuccess={() => setIsOpen(false)} />
            </DialogContent>
        </Dialog>  
    )
}