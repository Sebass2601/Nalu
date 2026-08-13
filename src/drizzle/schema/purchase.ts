import { integer, jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { createdAt, id, updatedAt } from "../schemaHelpers";
import { UserTable } from "./user";
import { ProductTable } from "./product";
import { relations } from "drizzle-orm";

export const PurchaseTable = pgTable("purchases", {
    id,
    pricePaidInCents: integer().notNull(),
    productDetails: jsonb()
     .notNull()
     .$type<{ name: string; description: string; imageUrl: string }>(),
    userId: uuid()
     .notNull()
     .references(() => UserTable.id, { onDelete: "restrict"}),
    productId: uuid()
     .notNull()
     .references(() => ProductTable.id, { onDelete: "restrict"}),
    // Hotmart's transaction code, e.g. HP17715690036014.
    //
    // One column where Stripe needed two. Stripe keyed checkouts by session and
    // refunds by charge, so both identifiers had to be stored for an incoming
    // refund to be matched back to its purchase. Hotmart identifies the sale
    // with this single code everywhere, refunds included.
    //
    // Unique, which is what makes the webhook handler idempotent: a redelivered
    // event cannot create a second row for one payment.
    orderId: text().notNull().unique(),
    // ISO country of the buyer, from `purchase.checkout_country.iso`.
    //
    // Free here, unlike with a provider whose checkout is created server-side:
    // those read the *server's* address and would place every buyer in Germany,
    // where the Hetzner box lives. Hotmart hosts the checkout and reports the
    // country the buyer actually selected.
    //
    // Kept because Panamanian tax treatment turns on whether revenue is
    // foreign-source, and that is answered per sale. Reconstructing it later
    // from bank statements is not realistic.
    buyerCountry: text(),
    refundedAt: timestamp({ withTimezone: true }),
    createdAt,
    updatedAt,
})

export const PurchaseRelationships = relations(
    PurchaseTable,
    ({ one }) => ({
     user: one(UserTable, {
        fields: [PurchaseTable.userId],
        references: [UserTable.id],
     }),
     product: one(ProductTable, {
        fields: [PurchaseTable.productId],
        references: [ProductTable.id],
     }),
    })
); 