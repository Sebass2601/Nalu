"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import z from "zod";
import {
    Form,
    FormControl,
    FormDescription,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
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
import { ImageManager } from "@/components/ImageManager";
import { actionToast } from "@/lib/actionToast";
import {
    AnnouncementStatus,
    announcementStatuses,
} from "@/drizzle/schema";
import {
    createAnnouncement,
    updateAnnouncement,
} from "../actions/announcements";
import {
    addAnnouncementImages,
    deleteAnnouncementImage,
    updateAnnouncementImageCaption,
    updateAnnouncementImageOrders,
} from "../actions/announcementImages";
import { announcementSchema } from "../schemas/announcements";

// Display-only Spanish labels for the DB status enum (values stay in English).
const announcementStatusLabels: Record<AnnouncementStatus, string> = {
    public: "Público",
    private: "Privado",
};

// Write an announcement, or edit one that exists.
//
// The two states differ in one way that matters: images belong to an announcement
// id, so there is nowhere to put them until the row exists. A new announcement
// therefore shows no picture list — it says why — and creating one lands straight
// on this same form in edit mode, where the list is there.
export function AnnouncementForm({
    announcement,
}: {
    announcement?: {
        id: string;
        name: string;
        content: string | null;
        status: AnnouncementStatus;
        images: { id: string; url: string; caption: string | null }[];
    };
}) {
    const form = useForm<z.infer<typeof announcementSchema>>({
        resolver: zodResolver(announcementSchema),
        defaultValues: {
            name: announcement?.name ?? "",
            // A new announcement starts private, matching the column's default.
            // Publishing is then something done deliberately, once it reads the
            // way its author wants — including once its pictures are in place,
            // which cannot happen until after the first save.
            status: announcement?.status ?? "private",
            content: announcement?.content ?? "",
        },
    });

    async function onSubmit(values: z.infer<typeof announcementSchema>) {
        // Creating redirects to the edit screen from the server, so there is no
        // success path to handle here for that case — this only ever sees the
        // result of an update, or an error from either.
        const action =
            announcement == null
                ? createAnnouncement
                : updateAnnouncement.bind(null, announcement.id);

        const data = await action(values);
        actionToast({ actionData: data });
    }

    return (
        <Form {...form}>
            <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="@container flex flex-col gap-6"
            >
                <div className="grid grid-cols-1 gap-6 @lg:grid-cols-2">
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
                                <FormDescription>
                                    Se muestra como título del anuncio y en el
                                    menú lateral.
                                </FormDescription>
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
                                    value={field.value}
                                >
                                    <FormControl>
                                        <SelectTrigger>
                                            {/* The label is passed in rather
                                                than left for the Select to work
                                                out on its own.

                                                Radix derives it from whichever
                                                <SelectItem> is selected, and the
                                                items live in a portal that only
                                                mounts once the menu is opened —
                                                so on the server there is nothing
                                                to read the label from and the
                                                field renders blank. The name and
                                                the content are plain inputs
                                                whose `value` is in the HTML,
                                                which is why this was the one
                                                field that looked empty until the
                                                JavaScript arrived.

                                                Derived from `field.value`, so it
                                                still follows the form: picking a
                                                new status updates form state,
                                                and this reads from it. */}
                                            <SelectValue>
                                                {
                                                    announcementStatusLabels[
                                                        field.value
                                                    ]
                                                }
                                            </SelectValue>
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        {announcementStatuses.map(status => (
                                            <SelectItem
                                                key={status}
                                                value={status}
                                            >
                                                {
                                                    announcementStatusLabels[
                                                        status
                                                    ]
                                                }
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <FormDescription>
                                    Solo los anuncios públicos aparecen en la
                                    página de anuncios.
                                </FormDescription>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>

                <FormField
                    control={form.control}
                    name="content"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Contenido</FormLabel>
                            <FormControl>
                                <Textarea
                                    className="min-h-60"
                                    placeholder="Escribe el anuncio en uno o más párrafos. Separa los párrafos con una línea vacía; el nombre de arriba se usa como título."
                                    {...field}
                                    value={field.value ?? ""}
                                />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                {announcement != null ? (
                    <ImageManager
                        images={announcement.images}
                        uploadEndpoint="announcementImage"
                        // The announcement half of the shared manager. The
                        // component is the same one the lesson form uses; only
                        // these four calls differ.
                        actions={{
                            addImages: urls =>
                                addAnnouncementImages(announcement.id, urls),
                            updateOrders: updateAnnouncementImageOrders,
                            updateCaption: updateAnnouncementImageCaption,
                            deleteImage: deleteAnnouncementImage,
                        }}
                    />
                ) : (
                    <p className="text-sm text-muted-foreground">
                        Guarda el anuncio primero para poder agregar imágenes.
                    </p>
                )}

                <div className="self-end">
                    <Button disabled={form.formState.isSubmitting} type="submit">
                        Guardar
                    </Button>
                </div>
            </form>
        </Form>
    );
}
