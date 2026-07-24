import { getGlobalTag, getIdTag } from "@/lib/dataCache"
import { updateTag } from "next/cache"

// Tag for "all categories" — refresh this when the whole list could change.
export function getCategoryGlobalTag() {
    return getGlobalTag("categories")
}

// Tag for one specific category — refresh this when a single category changes.
export function getCategoryIdTag(id: string) {
    return getIdTag("categories", id)
}

export function revalidateCategoryCache(id: string) {
    updateTag(getCategoryGlobalTag())
    updateTag(getCategoryIdTag(id))
}
