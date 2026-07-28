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
    stripeSessionId: text().notNull().unique(),
    // The PaymentIntent behind this purchase. Refund webhooks arrive keyed by
    // payment intent rather than by checkout session, so without this column a
    // `charge.refunded` event cannot be matched back to the row it should mark
    // as refunded. Nullable because rows written before this column existed
    // have no value for it.
    stripePaymentIntentId: text(),
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