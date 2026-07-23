import { getGlobalTag, getIdTag, getUserTag } from "@/lib/dataCache";
import { updateTag } from "next/cache";

export function getCourseSectionGlobalTag() {
    return getGlobalTag("courseSections")
}

export function getCourseSectionIdTag(id: string) {
    return getIdTag("courseSections", id);
}

export function getCourseSectionCourseTag(courseId: string) {
    return getUserTag("courseSections", courseId)
}

export function revalidateCourseSectionCache({
    id,
    courseId,
}: {
    id: string
    courseId: string
}) {
    updateTag(getCourseSectionGlobalTag())
    updateTag(getCourseSectionIdTag(id))
    updateTag(getCourseSectionCourseTag(courseId))
}