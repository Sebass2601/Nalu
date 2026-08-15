import { relations } from "drizzle-orm";
import { pgEnum, pgTable, text, integer, timestamp } from "drizzle-orm/pg-core";
import { createdAt, id, updatedAt } from "../schemaHelpers";
import { CourseProductTable } from "./courseProduct";

export const productStatuses = ["public", "private"] as const;
export type productStatus = (typeof productStatuses)[number];
export const productStatusEnum = pgEnum("product_status", productStatuses);

export const ProductTable = pgTable("products", {
    id,
    name: text().notNull(),
    description: text().notNull(),
    imageUrl: text().notNull(),
    priceInDollars: integer().notNull(),
    status: productStatusEnum().notNull().default("private"),
    // Hotmart needs three identifiers for three different jobs, and they are
    // not interchangeable:
    //
    //   externalProductId — the 7-digit ID. Arrives as `data.product.id` on
    //     every webhook, so it is the key matching a Hotmart sale to this row.
    //   checkoutCode — the hotlink (Products -> HotLinks). A different code
    //     entirely, and the one the checkout URL is built from.
    //   externalOfferCode — which offer, i.e. which price is charged.
    //
    // All three are nullable and entered by hand. Hotmart has no API to create
    // a product — the dashboard owns the catalogue, and every product passes a
    // human content review — so a product is drafted here first and its codes
    // pasted in once Hotmart has one to point at.
    externalProductId: text(),
    checkoutCode: text(),
    externalOfferCode: text(),

    // An optional second offer at a promotional price.
    //
    // Hotmart models a promotion as a separate offer on the same product, so
    // running one means pointing checkout at a different code. That keeps it
    // reversible and keeps Hotmart's own reporting honest about what each sale
    // actually earned.
    //
    // `promoPriceInDollars` is display copy only, exactly like `priceInDollars`
    // above: Hotmart charges whatever its offer says and nothing here ever
    // sends an amount. A promo counts as live when the code is set AND
    // `promoEndsAt` is null or still in the future — evaluated at read time, so
    // a promotion lapses on its own without a scheduled job to forget to run.
    promoOfferCode: text(),
    promoPriceInDollars: integer(),
    promoEndsAt: timestamp({ withTimezone: true }),

    // Long-form copy about what the course actually contains, shown as its own
    // panel under the syllabus on the product page.
    //
    // Separate from `description` because the two answer different questions at
    // different lengths: `description` is the one-paragraph pitch that sits
    // beside the price and also has to fit on a catalogue card, while this is
    // however many paragraphs it takes to lay out the material. Nullable, and
    // the panel is simply absent when it is null — every product that predates
    // this column keeps the page it already had.
    contentSummary: text(),
    createdAt,
    updatedAt,
});

export const ProductRelationships = relations(
    ProductTable, 
    ({ many }) => ({
    courseProducts: many(CourseProductTable),
}));
