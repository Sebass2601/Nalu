import { expireTags, getGlobalTag, getUserTag } from "@/lib/dataCache";

export function getPurchaseGlobalTag() {
    return getGlobalTag("purchases");
}

// Purchases are always read as "what has THIS person bought", so the useful
// tag is per-user rather than per-purchase.
export function getPurchaseUserTag(userId: string) {
    return getUserTag("purchases", userId);
}

// Purchases are only ever written by the Stripe webhook, which is a Route
// Handler — so this deliberately uses `expireTags` (built on `revalidateTag`)
// rather than the `updateTag` the other cache modules use. `updateTag` throws
// outside a Server Action, which would have made this function unusable by the
// only code that ever needs it.
export function expirePurchaseCache(userId: string) {
    expireTags(getPurchaseGlobalTag(), getPurchaseUserTag(userId));
}
