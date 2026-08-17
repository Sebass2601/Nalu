import { revalidateTag } from "next/cache"

type CACHE_TAG =
    | "announcements"
    | "products"
    | "users" 
    | "courses" 
    | "userCourseAccess" 
    | "courseSections"
    | "lessons"
    | "countryGroups"
    | "categories"
    | "purchases"
    | "subscriptions"
    | "userLessonComplete"

export function getGlobalTag(tag: CACHE_TAG) {
    return `global:${tag}` as const
}

export function getIdTag(tag: CACHE_TAG, id: string) {
    return `id:${id}-${tag}` as const
}

export function getCourseTag(tag: CACHE_TAG, id: string) {
    return `id:${id}-${tag}` as const
}

export function getUserTag(tag: CACHE_TAG, id: string) {
    return `id:${id}-${tag}` as const
}

// Cache invalidation that is legal inside a Route Handler.
//
// The `updateTag` used by the other cache modules throws outside a Server
// Action, so a Hotmart webhook — a Route Handler — cannot call it. `revalidateTag`
// works in both places, and `{ expire: 0 }` is the form Next documents for
// webhooks: it expires the entry immediately instead of the default
// stale-while-revalidate, so the buyer redirected back from Hotmart cannot land
// on a cached page still claiming they own nothing.
export function expireTags(...tags: string[]) {
    for (const tag of tags) {
        revalidateTag(tag, { expire: 0 })
    }
}