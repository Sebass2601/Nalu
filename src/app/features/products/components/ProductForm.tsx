"use client"

import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import z from "zod"
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form"
import { RequiredLabelIcon } from "@/components/RequiredLabelIcon"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { actionToast } from "@/lib/actionToast"
import { productStatus, productStatuses } from "@/drizzle/schema"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { MultiSelect } from "@/components/MultiSelect"
import { productSchema } from "../schemas/products"
import { createProduct, updateProduct } from "../actions/products"
import { useEffect, useRef } from "react"
import { toast } from "sonner"
import { ImageIcon, Loader2Icon } from "lucide-react"
import { useUploadThing } from "@/lib/uploadthing"

// Display-only Spanish labels for the DB status enum (values stay in English).
const productStatusLabels: Record<productStatus, string> = {
    public: "Público",
    private: "Privado",
}

export function ProductForm({
    product,
    courses,
}: {
    product?: {
        id: string
        name: string
        description: string
        priceInDollars: number
        imageUrl: string
        status: productStatus
        courseIds: string[]
    }
    courses: {
        id: string
        name: string
    }[]
}) {
    const form = useForm<z.infer<typeof productSchema>>({
        resolver: zodResolver(productSchema),
        defaultValues: product ?? {
            name: "",
            description: "",
            courseIds: [],
            imageUrl: "",
            priceInDollars: 0,
            status: "private",
        },
    })

    // In create mode, always start blank. Next.js keeps a recently visited
    // page alive in memory for a short while, so returning to /new re-shows
    // the same form instance with whatever was typed before; this effect
    // re-runs on every re-show and clears it back to the blank defaults.
    useEffect(() => {
        if (product == null) form.reset()
    }, [product, form])

    const imageInputRef = useRef<HTMLInputElement>(null)
    const { startUpload, isUploading } = useUploadThing("productImage", {
        // After the browser uploads to UploadThing, store the returned URL in
        // the form's imageUrl field (which is what gets saved to the product).
        onClientUploadComplete: files => {
            const url = files[0]?.ufsUrl
            if (url != null) {
                form.setValue("imageUrl", url, {
                    shouldValidate: true,
                    shouldDirty: true,
                })
            }
        },
        onUploadError: error => {
            toast.error(error.message)
        },
    })

    async function onSubmit(values: z.infer<typeof productSchema>) {
        const action =
            product == null ? createProduct : updateProduct.bind(null, product.id)
        const data = await action(values)
        actionToast({ actionData: data })
    }

    return (
        <Form {...form}>
            <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="flex gap-6 flex-col"
            >
                <div className="grid gap-6 grid-cols-1 md:grid-cols-2 items-start">
                    <FormField
                        control={form.control}
                        name="name"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>
                                    <RequiredLabelIcon />
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
                        name="priceInDollars"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>
                                    <RequiredLabelIcon />
                                    Precio
                                </FormLabel>
                                <FormControl>
                                    <Input
                                        type="number"
                                        {...field}
                                        step={1}
                                        min={0}
                                        onChange={e =>
                                            field.onChange(
                                                isNaN(e.target.valueAsNumber)
                                                    ? ""
                                                    : e.target.valueAsNumber
                                            )
                                        }
                                    />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="imageUrl"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>
                                    <RequiredLabelIcon />
                                    Imagen
                                </FormLabel>
                                <FormControl>
                                    <div className="flex items-center gap-3">
                                        {field.value ? (
                                            // Plain <img> avoids whitelisting the
                                            // UploadThing domain in next.config.
                                            <img
                                                src={field.value}
                                                alt=""
                                                className="size-16 rounded border object-cover"
                                            />
                                        ) : (
                                            <div className="flex size-16 items-center justify-center rounded border border-dashed text-muted-foreground">
                                                <ImageIcon className="size-5" />
                                            </div>
                                        )}
                                        <input
                                            ref={imageInputRef}
                                            type="file"
                                            accept="image/*"
                                            hidden
                                            onChange={event => {
                                                const file = event.target.files?.[0]
                                                if (file != null) startUpload([file])
                                                event.target.value = ""
                                            }}
                                        />
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            disabled={isUploading}
                                            onClick={() =>
                                                imageInputRef.current?.click()
                                            }
                                        >
                                            {isUploading ? (
                                                <>
                                                    <Loader2Icon className="size-4 animate-spin" />
                                                    Subiendo...
                                                </>
                                            ) : field.value ? (
                                                "Cambiar imagen"
                                            ) : (
                                                "Subir imagen"
                                            )}
                                        </Button>
                                    </div>
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="status"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Estado</FormLabel>
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
                                        {productStatuses.map(status => (
                                            <SelectItem key={status} value={status}>
                                                {productStatusLabels[status]}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>
                <FormField
                    control={form.control}
                    name="courseIds"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>
                                <RequiredLabelIcon />
                                Cursos incluidos
                            </FormLabel>
                            <FormControl>
                                <MultiSelect
                                    selectPlaceholder="Selecciona cursos"
                                    searchPlaceholder="Buscar cursos"
                                    options={courses}
                                    getLabel={c => c.name}
                                    getValue={c => c.id}
                                    selectedValues={field.value}
                                    onSelectedValuesChange={field.onChange}
                                />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>
                                <RequiredLabelIcon />
                                Descripción
                            </FormLabel>
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
    )
}
