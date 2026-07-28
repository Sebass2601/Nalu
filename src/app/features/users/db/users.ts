import { db } from "@/drizzle/db";
import { UserTable } from "@/drizzle/schema";
import { eq, isNull, and } from "drizzle-orm";
import { stripe } from "@/lib/stripe";
import { revalidateUserCache } from "./cache/users";

// Returns the Stripe Customer ID for a user, creating the Customer the first
// time they reach checkout.
//
// A one-time purchase works fine without a Customer — `customer_email` is
// enough to send a receipt. A subscription does not: Stripe hangs the
// subscription, its invoices, the saved payment method and the billing portal
// off a Customer, so without a stable ID a returning subscriber looks like a
// stranger and can never manage or cancel their plan.
//
// Created lazily rather than at sign-up because most users never buy anything,
// and every Customer object created for them would be permanent clutter in the
// Stripe dashboard.
export async function getOrCreateStripeCustomer(user: {
    id: string;
    email: string;
    name: string;
}) {
    const existing = await db.query.UserTable.findFirst({
        columns: { stripeCustomerId: true },
        where: and(eq(UserTable.id, user.id), isNull(UserTable.deletedAt)),
    });

    if (existing == null) throw new Error("Usuario no encontrado.");
    if (existing.stripeCustomerId != null) return existing.stripeCustomerId;

    const customer = await stripe.customers.create({
        email: user.email,
        name: user.name,
        // Lets us walk back from a Stripe Customer to our own user when
        // debugging a webhook or a support question, without a lookup table.
        metadata: { userId: user.id },
    });

    // Guarded on `stripeCustomerId IS NULL` so two checkouts started at the
    // same moment cannot overwrite each other. The loser of that race leaves
    // its Customer unused in Stripe, which is harmless — whereas overwriting
    // would orphan the subscription attached to the first one.
    const [updated] = await db
        .update(UserTable)
        .set({ stripeCustomerId: customer.id })
        .where(
            and(
                eq(UserTable.id, user.id),
                isNull(UserTable.stripeCustomerId)
            )
        )
        .returning({ stripeCustomerId: UserTable.stripeCustomerId });

    revalidateUserCache(user.id);

    // Undefined when the guard above matched nothing, i.e. another request won
    // the race. Re-read so we return the ID that actually got stored.
    if (updated?.stripeCustomerId != null) return updated.stripeCustomerId;

    const current = await db.query.UserTable.findFirst({
        columns: { stripeCustomerId: true },
        where: eq(UserTable.id, user.id),
    });

    if (current?.stripeCustomerId == null) {
        throw new Error("No se pudo asociar el cliente de Stripe.");
    }

    return current.stripeCustomerId;
}
