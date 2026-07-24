type CACHE_TAG = 
    | "products" 
    | "users" 
    | "courses" 
    | "userCourseAccess" 
    | "courseSections"
    | "lessons"
    | "countryGroups"
    | "categories"

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