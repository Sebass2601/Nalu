import { expireTags, getGlobalTag, getUserTag } from "@/lib/dataCache";
import { updateTag } from "next/cache";

export function getPurchaseGlobalTag() {
    return getGlobalTag("purchases");
}

// Purchases are always read as "what has THIS person bought", so the useful
// tag is per-user rather than per-purchase.
export function getPurchaseUserTag(userId: string) {
    return getUserTag("purchases", userId);
}

// For Route Handlers — specifically the Stripe webhook, which is where
// purchases are written and refunds are mirrored. Built on `revalidateTag`,
// because `updateTag` throws outside a Server Action and would make this
// unusable by the code that needs it most.
export function expirePurchaseCache(userId: string) {
    expireTags(getPurchaseGlobalTag(), getPurchaseUserTag(userId));
}

// For Server Actions — the admin refund button. Same tags, but `updateTag`
// gives read-your-own-writes: the re-render that follows the action waits for
// fresh data instead of being allowed to serve the entry it just invalidated.
// Without it, an admin could refund a purchase and watch the row still claim to
// be paid.
export function revalidatePurchaseCache(userId: string) {
    updateTag(getPurchaseGlobalTag());
    updateTag(getPurchaseUserTag(userId));
}
