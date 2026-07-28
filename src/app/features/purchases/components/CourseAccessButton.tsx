import Link from "next/link";
import { getCurrentUser } from "@/app/features/users/actions/currentUser";
import { userOwnsProduct } from "../db/purchases";
import { courseCtaClassName } from "./productCtaStyles";

// The "Ver curso" link on a single syllabus card, shown only to someone who
// bought the product it belongs to.
//
// It exists as its own component because of where it has to render. The
// syllabus is built from cached product data and appears immediately; ownership
// depends on the session cookie and cannot be known until the request arrives.
// Rather than make the whole syllabus wait on that, each card gets a small
// boundary of its own and the link fills in a moment later.
//
// Only mounted for products bundling more than one course — with a single
// course the main call to action already goes straight there, and a second
// button to the same place is just noise. That rule lives at the call site,
// where the course count is known from cached data, so it never becomes another
// thing to wait for.
//
// Both lookups it makes are already paid for by `ProductCallToAction` earlier in
// the same render: `getCurrentUser` is memoised per render and `userOwnsProduct`
// is cached per user, so repeating this on every card costs close to nothing.
export async function CourseAccessButton({
    productId,
    courseId,
}: {
    productId: string;
    courseId: string;
}) {
    const { userId } = await getCurrentUser();
    if (userId == null) return null;

    if (!(await userOwnsProduct({ userId, productId }))) return null;

    // The spacing lives here rather than on a wrapper at the call site: both
    // branches above render nothing, and an empty wrapper would still push the
    // card's content down by its own margin for every visitor who does not own
    // the product.
    return (
        <div className="mt-4">
            <Link href={`/courses/${courseId}`} className={courseCtaClassName}>
                Ver curso
            </Link>
        </div>
    );
}
