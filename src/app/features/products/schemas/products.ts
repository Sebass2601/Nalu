import { productStatuses } from "@/drizzle/schema";
import { z } from "zod";

// An untouched text input posts an empty string, not nothing. Left alone that
// would store "" and make "no code" and "the empty code" two distinct states
// that behave identically everywhere except in a null check — so every optional
// Hotmart code funnels through this.
function emptyToNull(schema: z.ZodString) {
    return z
        .union([schema, z.literal("")])
        .optional()
        .transform(value => (value == null || value === "" ? null : value));
}

export const productSchema = z.object({
    name: z.string().min(1, "Required"),
    priceInDollars: z.number().int().nonnegative(),
    description: z.string().min(1, "Required"),
    // Either a full external URL (https://…) or a local path (/imgs/…).
    imageUrl: z.union([
        z.url("Invalid url"),
        z.string().startsWith("/", "Invalid url"),
    ]),
    status: z.enum(productStatuses),
    // A product must bundle at least one course, otherwise buying it grants
    // access to nothing.
    courseIds: z.array(z.string()).min(1, "At least one course is required"),

    // --- Hotmart ---------------------------------------------------------
    // Three codes, entered by hand, because Hotmart has no API to create a
    // product: the dashboard owns the catalogue and every product passes a
    // human content review. They are optional so a product can still be
    // drafted here before it has a Hotmart counterpart to point at.
    //
    // Empty strings become null. A blank input posts "" rather than nothing,
    // and storing that would make "no code" and "the empty code" two different
    // states that behave identically everywhere except in a null check.
    externalProductId: emptyToNull(z.string()),
    checkoutCode: emptyToNull(z.string()),
    externalOfferCode: emptyToNull(z.string()),

    promoOfferCode: emptyToNull(z.string()),
    promoPriceInDollars: z.number().int().nonnegative().nullable().optional(),
    promoEndsAt: z.date().nullable().optional(),
})
    // A promotional price or end date without an offer code to go with it is
    // an unfinished thought: the price would be advertised on the product page
    // while checkout kept charging the base offer. Refusing it here is what
    // stops the page and the payment disagreeing.
    .refine(
        data =>
            data.promoOfferCode != null ||
            (data.promoPriceInDollars == null && data.promoEndsAt == null),
        {
            message:
                "Para una promoción hace falta el código de oferta de Hotmart.",
            path: ["promoOfferCode"],
        }
    )
    // Selling through an offer requires knowing which product page to send the
    // buyer to. One without the other is never usable.
    .refine(
        data =>
            (data.checkoutCode == null) === (data.externalOfferCode == null),
        {
            message:
                "El hotlink y el código de oferta se necesitan juntos.",
            path: ["externalOfferCode"],
        }
    );
