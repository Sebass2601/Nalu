import { getGlobalTag, getIdTag } from "@/lib/dataCache"
import { revalidateTag } from "next/cache"

// Tag for "all users" — refresh this when the whole list could change.
export function getUserGlobalTag() {
    return getGlobalTag("users")
}

// Tag for one specific user — refresh this when a single user changes.
export function getUserIdTag(id: string) {
    return getIdTag("users", id)
}

export function revalidateUserCache(id: string) {
    revalidateTag(getUserGlobalTag(), "max")
    revalidateTag(getUserIdTag(id), "max")
}