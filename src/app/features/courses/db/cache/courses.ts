import { getGlobalTag, getIdTag } from "@/lib/dataCache"
import { revalidateTag } from "next/cache"

// Tag for "all users" — refresh this when the whole list could change.
export function getCourseGlobalTag() {
    return getGlobalTag("courses")
}

// Tag for one specific user — refresh this when a single user changes.
export function getCourseIdTag(id: string) {
    return getIdTag("courses", id)
}

export function revalidateCourseCache(id: string) {
    revalidateTag(getCourseGlobalTag(), "max")
    revalidateTag(getCourseIdTag(id), "max")
}