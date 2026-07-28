import { relations } from "drizzle-orm";
import { pgEnum, pgTable, text, integer} from "drizzle-orm/pg-core";
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
    // The mirror of this product inside Stripe. `priceInDollars` above stays
    // the source of truth for what we display; these two point at the objects
    // Stripe actually bills against.
    //
    // They are separate columns because Stripe treats them differently: a
    // Product is a long-lived thing whose name and images can be edited, while
    // a Price is immutable — `unit_amount` can never change. Raising a price
    // therefore means creating a NEW Price, pointing `stripePriceId` at it, and
    // archiving the old one, which stays alive for past purchases.
    //
    // Both are nullable: products created before Stripe existed have neither,
    // and a product can be drafted before it is ever pushed to Stripe.
    stripeProductId: text(),
    stripePriceId: text(),
    createdAt,
    updatedAt,
});

export const ProductRelationships = relations(
    ProductTable, 
    ({ many }) => ({
    courseProducts: many(CourseProductTable),
}));
