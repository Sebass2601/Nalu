import { getGlobalTag } from "@/lib/dataCache";
import { updateTag } from "next/cache";

// Tag for "all country groups" — refresh this whenever any group's discount
// changes. Country-group data is small and always read together, so a single
// global tag is enough (no per-id tags needed).
export function getCountryGroupGlobalTag() {
    return getGlobalTag("countryGroups");
}

export function revalidateCountryGroupCache() {
    updateTag(getCountryGroupGlobalTag());
}
