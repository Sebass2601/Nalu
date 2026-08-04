"use client"

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { categorySchema } from "../schemas/categories";
import z from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { RequiredLabelIcon } from "@/components/RequiredLabelIcon";
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
import { createCategory, updateCategory } from "../actions/categories";
import { actionToast } from "@/lib/actionToast";
import { ASSIGNABLE_DOORWAYS } from "@/components/ui/parallaxEntrances";

// Radix's <Select> forbids an empty-string option value, so "no doorway" needs
// a sentinel of its own, translated back to null on save. Same trick as the
// course form's "Sin categoría".
const NO_DOORWAY = "none"

export function CategoryForm({ category, occupants = [] }: {
    category?: {
        id: string
        name: string
        description: string | null
        doorway: string | null
    }
    // Which doorways are already taken, and by whom. Passed in rather than
    // fetched here because the form is a client component; the page that
    // renders it is already reading categories anyway.
    occupants?: { doorway: string | null; name: string }[]
}) {

    // Who holds each doorway, minus this category's own — the doorway it
    // already sits at must stay selectable, or editing the description alone
    // would mean re-picking a doorway that was never free to begin with. A
    // category holds at most one doorway, so dropping that one entry is enough
    // to exclude itself.
    const takenBy = new Map(
        occupants.flatMap(occupant =>
            occupant.doorway == null || occupant.doorway === category?.doorway
                ? []
                : [[occupant.doorway, occupant.name] as const]
        )
    )

    const form = useForm<z.infer<typeof categorySchema>>({
        resolver: zodResolver(categorySchema),
        defaultValues: category
            ? {
                name: category.name,
                description: category.description ?? "",
                doorway: category.doorway,
            }
            : { name: "", description: "", doorway: null }
    })

    // Keep the fields showing what the server last sent.
    //
    // `useForm` reads defaultValues once, when the form mounts, and Next.js
    // keeps a recently visited page alive in memory for a while — so returning
    // to a form re-shows the same instance still holding whatever it had
    // before. On /new that meant text typed earlier reappearing in a blank
    // form; on /edit it meant a saved category coming back showing its
    // previous doorway rather than the one just stored. Resetting whenever the
    // incoming values change covers both: create mode resets to blank, edit
    // mode to the freshly loaded category.
    //
    // The dependencies are the individual fields rather than `category`
    // itself, which is a new object on every server render and would make this
    // fire — wiping what the admin was typing — when nothing had actually
    // changed.
    const { id, name, description, doorway } = category ?? {}
    useEffect(() => {
        form.reset({
            name: name ?? "",
            description: description ?? "",
            doorway: doorway ?? null,
        })
    }, [id, name, description, doorway, form])

    async function onSubmit(values: z.infer<typeof categorySchema>) {
        const action = category == null ? createCategory : updateCategory.bind(null, category.id)
        const data = await action(values)
        actionToast({ actionData: data })
    }

    return ( <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}
        className="flex gap-6 flex-col">
            <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
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
                name="doorway"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>Puerta del castillo</FormLabel>
                        <Select
                            value={field.value ?? NO_DOORWAY}
                            onValueChange={value =>
                                field.onChange(value === NO_DOORWAY ? null : value)
                            }
                        >
                            <FormControl>
                                <SelectTrigger>
                                    <SelectValue placeholder="Selecciona una puerta" />
                                </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                                <SelectItem value={NO_DOORWAY}>Sin puerta</SelectItem>
                                {ASSIGNABLE_DOORWAYS.map(doorway => {
                                    const occupant = takenBy.get(doorway.id)
                                    return (
                                        // An occupied doorway is shown rather than
                                        // hidden, so it is obvious the doorway
                                        // exists and which category to free up.
                                        <SelectItem
                                            key={doorway.id}
                                            value={doorway.id}
                                            disabled={occupant != null}
                                        >
                                            {doorway.id} — {doorway.label}
                                            {occupant && ` (${occupant})`}
                                        </SelectItem>
                                    )
                                })}
                            </SelectContent>
                        </Select>
                        {/* The homepage draws nothing at a doorway nobody holds,
                            and a category without one is still reachable from el
                            catálogo. */}
                        <p className="text-muted-foreground text-sm">
                            Sin puerta, la categoría no aparece en el castillo.
                        </p>
                        <FormMessage />
                    </FormItem>
                )}
            />
            <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>Descripción</FormLabel>
                        <FormControl>
                            <Textarea className="min-h-20 resize-none" {...field} />
                        </FormControl>
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
