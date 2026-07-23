"use client"

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import z from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { RequiredLabelIcon } from "@/components/RequiredLabelIcon";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { actionToast } from "@/lib/actionToast";
import { LessonStatus, lessonStatuses, LessonType, lessonTypes } from "@/drizzle/schema";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createLesson, updateLesson } from "../actions/lessons";
import { lessonSchema } from "../schemas/lessons";
import { YouTubeVideoPlayer } from "./YouTubeVideoPlayer";

// Display-only Spanish labels for the DB status enum (values stay in English).
const lessonStatusLabels: Record<LessonStatus, string> = {
    public: "Público",
    private: "Privado",
    preview: "Vista previa",
}

export function LessonForm({
    lesson,
    sections,
    defaultSectionId,
    onSuccess
}: { lesson?: {
        id: string
        name: string
        status: LessonStatus
        type: LessonType
        youtubeVideoId: string | null
        content: string | null
        description: string | null
        sectionId: string
    },
    defaultSectionId?: string,
    sections: { id: string; name: string;  }[]
    onSuccess?: () => void
}) {

    const form = useForm<z.infer<typeof lessonSchema>>({
        resolver: zodResolver(lessonSchema),
        defaultValues: {
            name: lesson?.name ?? "",
            status: lesson?.status ?? "public",
            type: lesson?.type ?? "video",
            youtubeVideoId: lesson?.youtubeVideoId ?? "",
            content: lesson?.content ?? "",
            description: lesson?.description ?? "",
            sectionId: lesson?.sectionId ?? defaultSectionId ?? sections
            [0]?.id ?? "",
        },
    })

    async function onSubmit(values: z.infer<typeof lessonSchema>) {
        const action =
            lesson == null
                ? createLesson
                : updateLesson.bind(null, lesson.id)
        const data = await action(values)
        actionToast({actionData: data })
        if(!data.error) onSuccess?.()
    }

    const type = form.watch("type")
    const videoId = form.watch("youtubeVideoId")


    return ( <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}
        className="flex gap-6 flex-col @container">
            <div  className="grid grid-cols-1 @lg:grid-cols-2 gap-6">
                <FormField 
                    control={form.control}
                    name="name"
                    render={({ field}) => (
                        <FormItem>
                            <FormLabel>
                                <RequiredLabelIcon/>
                                Nombre
                            </FormLabel>
                            <FormControl>
                                <Input {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="type"
                    render={({ field}) => (
                        <FormItem>
                            <FormLabel>
                                <RequiredLabelIcon/>
                                Tipo
                            </FormLabel>
                            <Select
                                onValueChange={field.onChange}
                                defaultValue={field.value}
                            >
                                <FormControl>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                    {lessonTypes.map(type => (
                                        <SelectItem key={type} value={type}>
                                            {type === "video" ? "Video" : "Texto"}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="sectionId"
                    render={({ field}) => (
                        <FormItem>
                            <FormLabel>
                                Sección
                            </FormLabel>
                            <Select
                                onValueChange={field.onChange}
                                defaultValue={field.value}
                            >
                                <FormControl>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                    {sections.map(section => (
                                        <SelectItem key={section.id} value={section.id}>
                                            {section.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField 
                    control={form.control}
                    name="status"
                    render={({ field}) => (
                        <FormItem>
                            <FormLabel>
                                Estado
                            </FormLabel>
                            <Select
                                onValueChange={field.onChange}
                                defaultValue={field.value}
                            >
                                <FormControl>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                    {lessonStatuses.map(status => (
                                        <SelectItem key={status} value={status}>
                                            {lessonStatusLabels[status]}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <FormMessage />
                        </FormItem>
                    )}
                />
            </div>
            {type === "video" && (
                <FormField
                    control={form.control}
                    name="description"
                    render={({ field}) => (
                        <FormItem>
                            <FormLabel>
                                Descripción
                            </FormLabel>
                            <FormControl>
                            <Textarea className="min-h-20 resize-none"
                                {...field}
                                value={field.value ?? ""}
                            />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
            )}

            {type === "video" ? (
                <FormField
                    control={form.control}
                    name="youtubeVideoId"
                    render={({ field}) => (
                        <FormItem>
                            <FormLabel>
                                <RequiredLabelIcon/>
                                ID del video de YouTube
                            </FormLabel>
                            <FormControl>
                                <Input {...field} value={field.value ?? ""} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
            ) : (
                <FormField
                    control={form.control}
                    name="content"
                    render={({ field}) => (
                        <FormItem>
                            <FormLabel>
                                <RequiredLabelIcon/>
                                Contenido
                            </FormLabel>
                            <FormControl>
                                <Textarea
                                    className="min-h-60"
                                    placeholder="Escribe la lección en uno o más párrafos. El nombre de la lección de arriba se usa como título."
                                    {...field}
                                    value={field.value ?? ""}
                                />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
            )}

            <div className="self-end">
                <Button disabled={form.formState.isSubmitting} type="submit">
                    Guardar
                </Button>
            </div>
            {type === "video" && videoId && (
                <div className="aspect-video">
                    <YouTubeVideoPlayer videoId={videoId} />
                </div>
            )}
        </form>
    </Form>
)};