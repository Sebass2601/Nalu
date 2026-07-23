import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { CourseTable } from "@/app/features/courses/components/CourseTable";
import { cacheTag } from "next/cache";
import { getCourseGlobalTag } from "@/app/features/courses/db/cache/courses";
import { db } from "@/drizzle/db";
import { CourseSectionTable, CourseTable as DbCoursetable, LessonTable, UserCourseAccessTable} from "@/drizzle/schema"
import { asc, countDistinct, eq } from "drizzle-orm";
import { getUSerCourseAccessGlobalTag } from "@/app/features/courses/db/cache/userCourseAccess";
import { getCourseSectionGlobalTag } from "@/app/features/CourseSections/db/cache/courseSections";
import { getLessonGlobalTag } from "@/app/features/lessons/db/cache/lessons";

export default async function CoursesPage() {
    const courses = await getCourses();
    return (
        <div className="min-h-[calc(100vh-5rem)] bg-white text-gray-900">
            <div className="container mx-auto px-6 py-6">
                <PageHeader title="Cursos">
                    <Button asChild>
                        <Link href="/admin/courses/new">Nuevo Curso</Link>
                    </Button>
                </PageHeader>

                <CourseTable courses={courses} />
            </div>
        </div>
    )
}

async function  getCourses() {
    "use cache"
    cacheTag(
        getCourseGlobalTag(), 
        getUSerCourseAccessGlobalTag(),
        getCourseSectionGlobalTag(),
        getLessonGlobalTag(),
    )
    
    return db
        .select({
            id: DbCoursetable.id,
            name: DbCoursetable.name,
            sectionsCount: countDistinct(CourseSectionTable.id),
            lessonsCount: countDistinct(LessonTable.id),
            studentsCount: countDistinct(UserCourseAccessTable.userId),
        })
        .from(DbCoursetable)
        .leftJoin(
            CourseSectionTable,
            eq(CourseSectionTable.courseId, DbCoursetable.id)
        )
        .leftJoin(
            LessonTable,
            eq(LessonTable.sectionId, CourseSectionTable.id)
        )
        .leftJoin(
            UserCourseAccessTable,
            eq(UserCourseAccessTable.courseId, DbCoursetable.id)
        )
        .orderBy(asc(DbCoursetable.name)).groupBy(DbCoursetable.id)
}