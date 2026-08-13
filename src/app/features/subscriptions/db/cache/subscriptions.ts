import { expireTags, getGlobalTag, getUserTag } from "@/lib/dataCache";

export function getSubscriptionGlobalTag() {
    return getGlobalTag("subscriptions");
}

// Subscriptions are always read as "does THIS person have one", so the useful
// tag is per-user.
export function getSubscriptionUserTag(userId: string) {
    return getUserTag("subscriptions", userId);
}

// Like purchases, subscriptions are written almost entirely by the Hotmart
// webhook — a Route Handler, where `updateTag` throws. `expireTags` is built on
// `revalidateTag` with `{ expire: 0 }`, which is legal in both Route Handlers
// and Server Actions, and expires immediately rather than serving stale data to
// someone who just subscribed.
export function expireSubscriptionCache(userId: string) {
    expireTags(getSubscriptionGlobalTag(), getSubscriptionUserTag(userId));
}
