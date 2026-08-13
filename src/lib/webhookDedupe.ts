import { db } from "@/drizzle/db";
import { ProcessedWebhookTable } from "@/drizzle/schema";

// Records this delivery and reports whether it had already been seen.
//
// TAKES THE TRANSACTION, and that is the whole point.
//
// The obvious implementation writes the marker first, as its own statement,
// then runs the handler. That version has a bug which only shows up under
// failure: if the handler then throws and the route answers 500, the marker is
// already committed — so Hotmart's retry is dismissed as a duplicate and the
// buyer silently never receives what they paid for. The failure looks like
// nothing at all, which is the worst kind.
//
// Passing the caller's transaction means the marker rolls back with the work.
// A retry then genuinely retries, and a success marks itself exactly once.
//
// `onConflictDoNothing` returning an empty array is the signal that the row
// already existed: one statement, no read-then-write race between two
// deliveries arriving at the same moment.
export async function alreadyProcessed(
    trx: Omit<typeof db, "$client">,
    eventId: string,
    eventType: string
) {
    const inserted = await trx
        .insert(ProcessedWebhookTable)
        .values({ eventId, eventType })
        .onConflictDoNothing()
        .returning({ eventId: ProcessedWebhookTable.eventId });

    return inserted.length === 0;
}
