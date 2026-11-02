"use client"

import { useState } from "react";
import { ActionButton } from "@/components/ActionButton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LessonStatus, lessonStatuses } from "@/drizzle/schema";
import { updateSectionLessonStatuses } from "../actions/lessons";
import { lessonStatusLabels } from "./LessonForm";

// Sets every lesson of a class to one status at once. Each lesson keeps its own
// status afterwards and can still be changed from its edit dialog.
//
// Starts with nothing chosen, and asks before applying, because the action
// overwrites each lesson's status: a stray "Vista previa" would open a whole
// paid class to everyone, and there is no record of what each lesson was before.
export function SectionLessonsStatusControl({
    sectionId,
}: {
    sectionId: string
}) {
    const [status, setStatus] = useState<LessonStatus>()

    return (
        <div className="flex items-center gap-2">
            <Select
                value={status}
                onValueChange={value => setStatus(value as LessonStatus)}
            >
                <SelectTrigger aria-label="Estado para todas las secciones">
                    <SelectValue placeholder="Estado" />
                </SelectTrigger>
                <SelectContent>
                    {lessonStatuses.map(option => (
                        <SelectItem key={option} value={option}>
                            {lessonStatusLabels[option]}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
            <ActionButton
                action={async () => {
                    // Unreachable while the button is disabled; narrows the type.
                    if (status == null) {
                        return { error: true, message: "Elige un estado." }
                    }
                    return updateSectionLessonStatuses({ sectionId, status })
                }}
                disabled={status == null}
                requireAreYouSure
                variant="outline"
            >
                Aplicar a todas
            </ActionButton>
        </div>
    )
}
