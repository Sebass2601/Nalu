import Link from "next/link";
import { getCurrentUser } from "@/app/features/users/actions/currentUser";
import { CheckoutButton } from "./CheckoutButton";
import { userOwnsProduct } from "../db/purchases";
import { productCtaClassName } from "./productCtaStyles";

// Decides what the main control on a product page does: sell the product, or
// open what was already bought.
//
// The check is deliberately "did this person buy THIS product", not "can this
// person watch these courses". A subscriber can already watch every course in
// the subscription, but buying the product still gets them something the
// subscription does not — permanent access that survives cancelling. Asking the
// wider question would hide the buy button from exactly the people most likely
// to want it.
//
// A refund undoes this on its own: `userOwnsProduct` ignores purchases with
// `refundedAt` set, so a refunded product goes back to being for sale with no
// extra handling here.
export async function ProductCallToAction({
    productId,
    courses,
}: {
    productId: string;
    // Only the count and, for a lone course, its id — the names are the
    // syllabus cards' business, not this component's.
    courses: { id: string }[];
}) {
    const { userId } = await getCurrentUser();

    // Signed out visitors get the buy button rather than a prompt to log in.
    // `startCheckout` sends them to /login and they arrive there having already
    // decided to buy, instead of being asked to prove who they are first.
    const owned =
        userId != null && (await userOwnsProduct({ userId, productId }));

    if (!owned) return <CheckoutButton productId={productId} />;

    // Nothing to open. A product that bundles no courses is unusual but
    // possible, and a button leading nowhere is worse than a sentence — so this
    // says what is true and stops there.
    if (courses.length === 0) {
        return (
            <p className="text-lg tracking-widest text-yellow-200 uppercase">
                Ya tienes este producto
            </p>
        );
    }

    // One course means there is no choice to make, so the button skips the
    // choosing entirely and goes straight in.
    if (courses.length === 1) {
        return (
            <Link
                href={`/courses/${courses[0].id}`}
                className={productCtaClassName}
            >
                Ir al curso
            </Link>
        );
    }

    // Several courses, and nothing here. A single button cannot answer "which
    // one", and one that only scrolls the page down is a step that asks the
    // visitor to act before it tells them anything. The choice belongs where the
    // information to make it already is: each syllabus card below carries its
    // own "Ver curso" link, next to the sections and lessons that distinguish
    // one course from another.
    return null;
}

// Stands in while the checks above run. Shaped like the button it replaces and
// styled after the page's own loading state, so the layout does not jump when
// the real control arrives.
//
// Deliberately not the buy button: using that as the fallback would show
// "Comprar ahora" to someone who already owns the product and then swap it,
// which reads as a mistake being corrected.
export function ProductCallToActionSkeleton() {
    return (
        <div className="h-14 w-48 animate-pulse rounded-lg bg-yellow-200/10" />
    );
}
