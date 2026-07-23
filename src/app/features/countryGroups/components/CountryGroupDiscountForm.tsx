"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import z from "zod";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { actionToast } from "@/lib/actionToast";
import { countryGroupDiscountSchema } from "../schemas/countryGroups";
import { updateCountryGroupDiscount } from "../actions/countryGroups";

export function CountryGroupDiscountForm({
    countryGroup,
}: {
    countryGroup: {
        id: string;
        // Fraction 0–1 from the DB (or null if unset); shown to the admin as %.
        recommendedDiscountPercentage: number | null;
    };
}) {
    const form = useForm<z.infer<typeof countryGroupDiscountSchema>>({
        resolver: zodResolver(countryGroupDiscountSchema),
        defaultValues: {
            discountPercentage:
                (countryGroup.recommendedDiscountPercentage ?? 0) * 100,
        },
    });

    async function onSubmit(values: z.infer<typeof countryGroupDiscountSchema>) {
        const data = await updateCountryGroupDiscount(countryGroup.id, values);
        actionToast({ actionData: data });
    }

    return (
        <Form {...form}>
            <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="flex items-end gap-2"
            >
                <FormField
                    control={form.control}
                    name="discountPercentage"
                    render={({ field }) => (
                        <FormItem className="flex-1">
                            <FormLabel className="sr-only">
                                Discount %
                            </FormLabel>
                            <FormControl>
                                <div className="flex items-center gap-1">
                                    <Input
                                        type="number"
                                        min={0}
                                        max={100}
                                        step={1}
                                        {...field}
                                        onChange={e =>
                                            field.onChange(
                                                isNaN(e.target.valueAsNumber)
                                                    ? ""
                                                    : e.target.valueAsNumber
                                            )
                                        }
                                    />
                                    <span className="text-sm text-gray-500">
                                        %
                                    </span>
                                </div>
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <Button type="submit" disabled={form.formState.isSubmitting}>
                    Save
                </Button>
            </form>
        </Form>
    );
}
