import { getGlobalTag, getIdTag } from "@/lib/dataCache";
import { updateTag } from "next/cache";

// Tag for the whole set — refresh this when the list of announcements could have
// changed: one published, unpublished, added or removed.
export function getAnnouncementGlobalTag() {
    return getGlobalTag("announcements");
}

// Tag for one announcement, so editing its words does not throw away the list.
export function getAnnouncementIdTag(id: string) {
    return getIdTag("announcements", id);
}

// Both, always, and that is deliberate. An announcement's images are part of what
// its page renders, and its name and date are part of the menu drawn beside it —
// so every write that touches one touches the other's reader too. There is no
// edit worth the risk of refreshing only half of it.
export function revalidateAnnouncementCache(id: string) {
    updateTag(getAnnouncementGlobalTag());
    updateTag(getAnnouncementIdTag(id));
}
