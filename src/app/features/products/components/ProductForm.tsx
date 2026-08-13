"use client"

import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import z from "zod"
import {
    Form,
    FormControl,
    FormDescription,
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
import { useEffect } from "react"
import { ImageUploadField } from "@/components/ImageUploadField"

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
        externalProductId?: string | null
        checkoutCode?: string | null
        externalOfferCode?: string | null
        promoOfferCode?: string | null
        promoPriceInDollars?: number | null
        promoEndsAt?: Date | null
    }
    courses: {
        id: string
        name: string
    }[]
}) {
    // Three generics rather than one, because the schema transforms: empty
    // strings from blank inputs become null on the way out. `z.infer` is the
    // OUTPUT type, so using it alone makes the resolver disagree with
    // `defaultValues`, which must satisfy the INPUT type.
    const form = useForm<
        z.input<typeof productSchema>,
        unknown,
        z.output<typeof productSchema>
    >({
        resolver: zodResolver(productSchema),
        defaultValues: product ?? {
            name: "",
            description: "",
            courseIds: [],
            imageUrl: "",
            priceInDollars: 0,
            status: "private",
            // Blank rather than undefined so the inputs are controlled from the
            // first render. React logs a warning the moment a controlled input
            // is handed undefined and then a real value.
            externalProductId: "",
            checkoutCode: "",
            externalOfferCode: "",
            promoOfferCode: "",
            promoPriceInDollars: null,
            promoEndsAt: null,
        },
    })

    // In create mode, always start blank. Next.js keeps a recently visited
    // page alive in memory for a short while, so returning to /new re-shows
    // the same form instance with whatever was typed before; this effect
    // re-runs on every re-show and clears it back to the blank defaults.
    useEffect(() => {
        if (product == null) form.reset()
    }, [product, form])

    // The OUTPUT type: by the time this runs the schema has already turned the
    // blank inputs into nulls.
    async function onSubmit(values: z.output<typeof productSchema>) {
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
                                    {/* Not clearable: a product is the thing
                                        being sold, so it must always carry a
                                        picture. */}
                                    <ImageUploadField
                                        endpoint="productImage"
                                        value={field.value}
                                        onChange={value =>
                                            form.setValue("imageUrl", value ?? "", {
                                                shouldValidate: true,
                                                shouldDirty: true,
                                            })
                                        }
                                    />
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

                {/* Hotmart owns the catalogue and has no API to create a
                    product, so these three codes are typed in by hand once the
                    product exists over there. Only the first is verifiable on
                    save — Hotmart offers no lookup for the other two, which is
                    why the checkout URL gets opened by hand once before going
                    live. */}
                <fieldset className="flex flex-col gap-4 rounded-lg border border-gold/20 p-4">
                    <legend className="px-2 text-sm font-medium">Hotmart</legend>
                    <p className="text-sm text-muted-foreground">
                        Deja estos campos vacíos hasta que el producto exista en
                        Hotmart. Sin ellos el producto no se puede comprar.
                    </p>
                    <div className="grid gap-6 grid-cols-1 md:grid-cols-3 items-start">
                        <FormField
                            control={form.control}
                            name="externalProductId"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>ID del producto</FormLabel>
                                    <FormControl>
                                        <Input
                                            placeholder="1234567"
                                            {...field}
                                            value={field.value ?? ""}
                                        />
                                    </FormControl>
                                    <FormDescription>
                                        7 dígitos. Se verifica al guardar.
                                    </FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="checkoutCode"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Hotlink</FormLabel>
                                    <FormControl>
                                        <Input
                                            placeholder="W12345678X"
                                            {...field}
                                            value={field.value ?? ""}
                                        />
                                    </FormControl>
                                    <FormDescription>
                                        Solo el código, no la URL completa.
                                    </FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="externalOfferCode"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Código de oferta</FormLabel>
                                    <FormControl>
                                        <Input
                                            placeholder="a1b2c3d4"
                                            {...field}
                                            value={field.value ?? ""}
                                        />
                                    </FormControl>
                                    <FormDescription>
                                        La oferta con el precio base.
                                    </FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>
                </fieldset>

                {/* A promotion is a SECOND offer in Hotmart, not a discount on
                    the first. Filling these points checkout at that offer and
                    strikes through the original price on the product page;
                    clearing the code puts everything back. */}
                <fieldset className="flex flex-col gap-4 rounded-lg border border-gold/20 p-4">
                    <legend className="px-2 text-sm font-medium">
                        Promoción (opcional)
                    </legend>
                    <div className="grid gap-6 grid-cols-1 md:grid-cols-3 items-start">
                        <FormField
                            control={form.control}
                            name="promoOfferCode"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Código de oferta promocional</FormLabel>
                                    <FormControl>
                                        <Input
                                            {...field}
                                            value={field.value ?? ""}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="promoPriceInDollars"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Precio promocional</FormLabel>
                                    <FormControl>
                                        <Input
                                            type="number"
                                            {...field}
                                            value={field.value ?? ""}
                                            onChange={e =>
                                                field.onChange(
                                                    e.target.value === ""
                                                        ? null
                                                        : e.target.valueAsNumber
                                                )
                                            }
                                        />
                                    </FormControl>
                                    <FormDescription>
                                        Solo para mostrar. Hotmart cobra lo que
                                        diga su oferta.
                                    </FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="promoEndsAt"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Termina el</FormLabel>
                                    <FormControl>
                                        <Input
                                            type="date"
                                            value={
                                                field.value
                                                    ? new Date(field.value)
                                                          .toISOString()
                                                          .slice(0, 10)
                                                    : ""
                                            }
                                            onChange={e =>
                                                field.onChange(
                                                    e.target.value === ""
                                                        ? null
                                                        : new Date(
                                                              `${e.target.value}T23:59:59`
                                                          )
                                                )
                                            }
                                        />
                                    </FormControl>
                                    <FormDescription>
                                        Vacío = hasta que la quites.
                                    </FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>
                </fieldset>

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
