"use client"

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { courseSchema } from "../schemas/courses";
import z from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { RequiredLabelIcon } from "@/components/RequiredLabelIcon";
import { ImageUploadField } from "@/components/ImageUploadField";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { createCourse, updateCourse } from "../actions/courses";
import { actionToast } from "@/lib/actionToast";

// Radix's <Select> forbids an empty-string option value, so we use this
// sentinel for the "no category" choice and translate it back to null on save.
const NO_CATEGORY = "none"

export function CourseForm({ course, categories }: {
    course?: {
        id: string
        name: string
        description: string
        imageUrl: string | null
        categoryId: string | null
        includedInSubscription: boolean
        // Null on every course that predates the column; the checkbox reads it
        // as unchecked, which is what it means.
        uploadedWeekly: boolean | null
    }
    categories: {
        id: string
        name: string
    }[]
}) {

    const form = useForm<z.infer<typeof courseSchema>>({
        resolver: zodResolver(courseSchema),
        defaultValues: course
            ? { ...course, uploadedWeekly: course.uploadedWeekly ?? false }
            : {
                  name: "",
                  description: "",
                  imageUrl: null,
                  categoryId: null,
                  includedInSubscription: false,
                  uploadedWeekly: false,
              }
    })

    // In create mode, always start blank. Next.js keeps a recently visited
    // page alive in memory for a short while, so returning to /new re-shows
    // the same form instance with whatever was typed before; this effect
    // re-runs on every re-show and clears it back to the blank defaults.
    useEffect(() => {
        if (course == null) form.reset()
    }, [course, form])

    async function onSubmit(values: z.infer<typeof courseSchema>) {
        const action = course == null ? createCourse : updateCourse.bind(null, course.id)
        const data = await action(values)
        actionToast({actionData: data })
    }


    return ( <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}
        className="flex gap-6 flex-col">
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
                name="categoryId"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>Categoría</FormLabel>
                        <Select
                            value={field.value ?? NO_CATEGORY}
                            onValueChange={value =>
                                field.onChange(value === NO_CATEGORY ? null : value)
                            }
                        >
                            <FormControl>
                                <SelectTrigger>
                                    <SelectValue placeholder="Selecciona una categoría" />
                                </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                                <SelectItem value={NO_CATEGORY}>Sin categoría</SelectItem>
                                {categories.map(category => (
                                    <SelectItem key={category.id} value={category.id}>
                                        {category.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <FormMessage />
                    </FormItem>
                )}
            />
            {/* No RequiredLabelIcon: the column is nullable and a course
                without art renders as text, exactly as it did before. */}
            <FormField
                control={form.control}
                name="imageUrl"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>Imagen</FormLabel>
                        <FormControl>
                            <ImageUploadField
                                endpoint="courseImage"
                                value={field.value}
                                onChange={field.onChange}
                                clearable
                            />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                )}
            />
            <FormField
                control={form.control}
                name="description"
                render={({ field}) => (
                    <FormItem>
                        <FormLabel>
                            <RequiredLabelIcon/>
                            Descripción
                        </FormLabel>
                        <FormControl>
                            <Textarea className="min-h-20 resize-none" {...field} />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                )}
            />
            {/* A plain checkbox rather than a Select: this is the switch that
                decides whether every subscriber gets this course for free, so
                it should read as an explicit, deliberate action. */}
            <FormField
                control={form.control}
                name="includedInSubscription"
                render={({ field }) => (
                    <FormItem>
                        <div className="flex items-start gap-3 rounded-md border p-4">
                            <FormControl>
                                <input
                                    type="checkbox"
                                    checked={field.value ?? false}
                                    onChange={event =>
                                        field.onChange(event.target.checked)
                                    }
                                    className="mt-1 size-4 cursor-pointer"
                                />
                            </FormControl>
                            <div className="flex flex-col gap-1">
                                <FormLabel className="cursor-pointer">
                                    Incluir en la suscripción
                                </FormLabel>
                                <p className="text-muted-foreground text-xs">
                                    Los suscriptores activos podrán ver este
                                    curso sin comprarlo. Puedes activarlo o
                                    desactivarlo cuando quieras; quienes lo
                                    hayan comprado conservan su acceso.
                                </p>
                            </div>
                        </div>
                        <FormMessage />
                    </FormItem>
                )}
            />
            {/* Whether the course is still being written. A checkbox for the
                same reason as the one above: it changes what every card for
                this course says to a visitor, so it should be a deliberate
                tick rather than a value buried in a dropdown. */}
            <FormField
                control={form.control}
                name="uploadedWeekly"
                render={({ field }) => (
                    <FormItem>
                        <div className="flex items-start gap-3 rounded-md border p-4">
                            <FormControl>
                                <input
                                    type="checkbox"
                                    checked={field.value ?? false}
                                    onChange={event =>
                                        field.onChange(event.target.checked)
                                    }
                                    className="mt-1 size-4 cursor-pointer"
                                />
                            </FormControl>
                            <div className="flex flex-col gap-1">
                                <FormLabel className="cursor-pointer">
                                    Contenido semanal
                                </FormLabel>
                                <p className="text-muted-foreground text-xs">
                                    Marca esto si sigues subiendo material a
                                    este curso cada semana. Las tarjetas del
                                    curso — y las de los productos que lo
                                    incluyen — mostrarán una etiqueta de
                                    &ldquo;Contenido semanal&rdquo;.
                                </p>
                            </div>
                        </div>
                        <FormMessage />
                    </FormItem>
                )}
            />
            <div className="self-end">
                <Button disabled={form.formState.isSubmitting} type="submit">
                    Guardar
                </Button>
            </div>
        </form>
    </Form>
)};
