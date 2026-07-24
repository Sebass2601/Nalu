import { CategoryTable, CourseSectionTable, CourseTable, ImageLessonTable, LessonTable } from  "@/drizzle/schema";
import { getCourseIdTag } from "@/app/features/courses/db/cache/courses";
import { getCategoryGlobalTag } from "@/app/features/categories/db/cache/categories";
import { getCourseSectionCourseTag } from "@/app/features/CourseSections/db/cache/courseSections";
import { getLessonCourseTag } from "@/app/features/lessons/db/cache/lessons";
import { db } from "@/drizzle/db";
import { asc, eq } from "drizzle-orm";
import { cacheTag } from "next/cache";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/PageHeader";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CourseForm } from "@/app/features/courses/components/CourseForm";
import { Suspense } from "react";
import { DialogTrigger } from "@/components/ui/dialog";
import { SectionFormDialog } from "@/app/features/CourseSections/components/SectionFormDialog";
import { Button } from "@/components/ui/button";
import { EyeClosed, PlusIcon } from "lucide-react";
import { SortableSectionList } from "@/app/features/CourseSections/components/SortableSectionList";
import { LessonFormDialog } from "@/app/features/lessons/components/LessonFormDialog";
import { SortableLessonList } from "@/app/features/lessons/components/SortableLessonList";
import { cn } from "@/lib/utils";
import { requireAdmin } from "@/app/features/users/actions/currentUser";

export default async function EditCoursePage({
    params,
}: {
    params: Promise<{ courseId: string }>
}) {
    await requireAdmin();

    return (
        <div className="container my-6">
            <Suspense fallback={<div>Cargando...</div>}>
                <EditCourseContent params={params} />
            </Suspense>
        </div>
    )
}

async function EditCourseContent({
    params,
}: {
    params: Promise<{ courseId: string }>
}) {
    const { courseId } = await params;
    const course = await getCourse(courseId);

    if (course == null) return notFound()
    
    return (
        <>
            <PageHeader title={course.name} />
            <Tabs defaultValue="lessons">
                <TabsList>
                    <TabsTrigger value="lessons">Lecciones</TabsTrigger>
                    <TabsTrigger value="details">Detalles</TabsTrigger>
                </TabsList>
                <TabsContent value="lessons">
                    <Card>
                        <CardHeader className="flex items-center flex-row justify-between">
                            <CardTitle>Secciones</CardTitle>
                            <SectionFormDialog courseId={course.id}>
                                <DialogTrigger asChild>
                                    <Button variant="outline">
                                        <PlusIcon /> Nueva Sección
                                    </Button>
                                </DialogTrigger>
                            </SectionFormDialog>
                        </CardHeader>
                        <CardContent>
                            <SortableSectionList 
                            courseId={course.id}
                            sections={course.courseSections} 
                            />
                        </CardContent>
                    </Card>
                    <hr className="my-4" />
                    {course.courseSections.map(section => (
                        <Card key={section.id}>
                            <CardHeader className="flex items-center flex-row justify-between gap-4">
                                <CardTitle className={cn(
                                    "flex items-center gap-2", 
                                    section.status === "private" && "text-muted-foreground"
                                    )}
                                >
                                    {section.status === "private" && <EyeClosed />} {section.name}
                                </CardTitle>
                                <LessonFormDialog
                                    defaultSectionId={section.id}
                                    sections={course.courseSections}
                                >
                                    <DialogTrigger asChild>
                                        <Button variant="outline">
                                            <PlusIcon /> Nueva Lección
                                        </Button>
                                    </DialogTrigger>
                                </LessonFormDialog>
                            </CardHeader>
                            <CardContent>
                                <SortableLessonList
                                sections={course.courseSections}
                                lessons={section.lessons}
                                />
                            </CardContent>
                        </Card>
                    ))}
                </TabsContent>
                <TabsContent value="details">
                    <Card>
                      <CardHeader>
                        <CourseForm course={course} categories={await getCategories()} />
                      </CardHeader>
                    </Card>
                </TabsContent>
            </Tabs>
        </>
    )
       
}

async function getCourse(id: string) {
    "use cache"
    cacheTag(
        getCourseIdTag(id),
        getCourseSectionCourseTag(id),
        getLessonCourseTag(id)
    );

    return db.query.CourseTable.findFirst({
        columns: { id: true, name: true, description: true, categoryId: true },
        where: eq(CourseTable.id, id),
        with: {
            courseSections: {
                orderBy: asc(CourseSectionTable.order),
                columns: { id: true, status: true, name: true },
                with : {
                    lessons: {
                        orderBy: asc(LessonTable.order),
                        columns: {
                            id: true,
                            name: true,
                            status: true,
                            type: true,
                            description: true,
                            youtubeVideoId: true,
                            content: true,
                            sectionId: true,
                        },
                        with: {
                            images: {
                                orderBy: asc(ImageLessonTable.order),
                                columns: { id: true, url: true, caption: true },
                            }
                        }
                    }
                }
            }
        }

    })


}

async function getCategories() {
    "use cache"
    cacheTag(getCategoryGlobalTag())

    return db.query.CategoryTable.findMany({
        orderBy: asc(CategoryTable.name),
        columns: { id: true, name: true },
    })
}
