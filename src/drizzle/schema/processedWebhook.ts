import { pgTable, text, timestamp } from "drizzle-orm/pg-core";

// One row per webhook delivery already handled.
//
// Keyed on Hotmart's event `id`. This is the ONLY replay defence available:
// Hotmart authenticates with a static `X-HOTMART-HOTTOK` header that carries no
// timestamp and is not bound to the request body, so there is nothing else to
// reject a stale or replayed request by.
//
// The row is written INSIDE the same transaction as the work it guards, which
// is the whole point. Writing it first as a separate statement is a trap that
// only springs under failure: a handler that then throws would leave the row
// committed, and Hotmart's retry would be dismissed as a duplicate — silently
// robbing the buyer of the access they paid for. Rolling the marker back with
// the work means a retry genuinely retries.
export const ProcessedWebhookTable = pgTable("processed_webhooks", {
    eventId: text().primaryKey(),
    eventType: text().notNull(),
    processedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
});
