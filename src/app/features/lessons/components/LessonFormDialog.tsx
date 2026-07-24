"use client"

import { LessonStatus, LessonType } from "@/drizzle/schema";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ReactNode, useState } from "react"
import { LessonForm } from "./LessonForm";

export function LessonFormDialog({
    sections,
    defaultSectionId,
    lesson,
    children,
} : {
    defaultSectionId?: string
    children: ReactNode
    sections: { id: string; name: string; }[],
    lesson?: {
        id: string
        name: string
        status: LessonStatus
        type: LessonType
        youtubeVideoId: string | null
        content: string | null
        description: string | null
        sectionId: string
        images: { id: string; url: string; caption: string | null }[]
    }
}) {
    const [isOpen, setIsOpen] = useState(false);
    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            {children}
            <DialogContent className="max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>{lesson == null ? "Nueva Lección" : `Editar ${lesson.name}`}</DialogTitle>
                </DialogHeader>
                <LessonForm 
                    lesson={lesson}
                    sections={sections} 
                    defaultSectionId={defaultSectionId} 
                    onSuccess={() => setIsOpen(false)} />
            </DialogContent>
        </Dialog>  
    )
}
