import { getGlobalTag, getIdTag } from "@/lib/dataCache"
import { updateTag } from "next/cache"

// Tag for "all users" — refresh this when the whole list could change.
export function getCourseGlobalTag() {
    return getGlobalTag("courses")
}

// Tag for one specific user — refresh this when a single user changes.
export function getCourseIdTag(id: string) {
    return getIdTag("courses", id)
}

export function revalidateCourseCache(id: string) {
    updateTag(getCourseGlobalTag())
    updateTag(getCourseIdTag(id))
}