import { getGlobalTag, getIdTag } from "@/lib/dataCache"
import { updateTag } from "next/cache"

// Tag for "all products" — refresh this when the whole list could change.
export function getProductGlobalTag() {
    return getGlobalTag("products")
}

// Tag for one specific product — refresh this when a single product changes.
export function getProductIdTag(id: string) {
    return getIdTag("products", id)
}

export function revalidateProductCache(id: string) {
    updateTag(getProductGlobalTag())
    updateTag(getProductIdTag(id))
}
