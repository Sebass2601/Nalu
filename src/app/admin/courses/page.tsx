import Link from "next/link";
import { PageHeader } from "@/app/components/PageHeader";
import { Button } from "@/app/components/ui/button";

export default function CoursesPage() {
    return (
        <div className="min-h-[calc(100vh-5rem)] bg-white text-gray-900">
            <div className="container mx-auto px-6 py-6">
                <PageHeader title="Courses">
                    <Button asChild>
                        <Link href="/admin/courses/new">New Course</Link>
                    </Button>
                </PageHeader>
            </div>
        </div>
    )
}