import { getCurrentUser } from "@/app/features/users/actions/currentUser";
import { CheckoutButton } from "./CheckoutButton";
import { productIsForSaleTo } from "../db/purchases";
import { PlaqueButton } from "@/components/ui/PlaqueButton";
import { bevelFace } from "@/components/ui/plaque";

// Decides what the main control on a product page does: sell the product, or
// open what this person already has.
//
// The buy button goes away only when buying would get them nothing new —
// `productIsForSale` holds the rule, and `startCheckout` refuses by the same
// one. In short: every course in the product is already theirs for good,
// whether they bought it, an admin handed it to them, or some mix of the two
// across different products. Holding part of a bundle leaves the bundle for
// sale, because the rest of it is still something they can only get by paying.
//
// It is deliberately NOT the same test as "can this person watch these
// courses". A subscriber can already watch every course in the subscription,
// but buying still gets them something the subscription does not — permanent
// access that survives cancelling. Asking the wider question would hide the buy
// button from exactly the people most likely to want it. A subscription is a
// rental that lapses, and this button sells the thing outright.
//
// Refunds and revocations undo it without any handling here. A refund removes
// the courses nothing else paid for and an admin revoking a grant removes that
// course, so the product stops being fully held and goes back on sale by
// itself.
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
    const forSale =
        userId == null || (await productIsForSaleTo({ userId, productId }));

    if (forSale) {
        // A lone course has nowhere else to be reached from: the page draws no
        // syllabus card for a single-course product, because that card said the
        // course's name where the title already stood, its size where the
        // header already counted it, and carried one button. Only the button
        // was worth keeping, so it joins the buy button here.
        //
        // Secondary rather than a second gold plaque. Buying is what this page
        // is for, and two solid plaques side by side leave a reader with no way
        // to tell which one the page is asking for — the same rule CheckoutButton
        // states for the upgrade offer, and the same reason.
        //
        // Worded as the offer it is to someone who has not bought the course:
        // the first class can be watched for free. An owner never reaches this
        // branch, and gets "Ir al curso" below instead.
        if (courses.length === 1) {
            return (
                // Reversed while stacked, so on a phone the free class sits above
                // the buy button. Beside it from `sm` up, in reading order:
                // buying first, looking second.
                //
                // `items-start` because CheckoutButton is a column — the button
                // plus its redirect notice and discount switch — and the link
                // belongs level with the plaque at the top of it, not centred
                // against the whole stack.
                <div className="flex w-full flex-col-reverse gap-4 sm:w-auto sm:flex-row sm:items-start">
                    <CheckoutButton productId={productId} />
                    <PlaqueButton
                        href={`/courses/${courses[0].id}`}
                        variant="secondary"
                        boldOutline
                        // Matching the buy button's own width rule, or the two
                        // would be different widths in the stacked layout where
                        // they sit directly on top of one another.
                        className="w-full sm:w-auto"
                    >
                        {/* Too long for a phone at the plaque's usual spacing:
                            at 0.2em it needs about 315px and a 360px screen
                            leaves the label 264. Tighter spacing keeps it on
                            one line from a 375px phone up, and below that it
                            is allowed to wrap onto two balanced lines rather
                            than be cut off by the plaque's edge. */}
                        <span className="tracking-[0.1em] text-balance whitespace-normal sm:tracking-[0.2em] sm:whitespace-nowrap">
                            Ver primera clase gratis
                        </span>
                    </PlaqueButton>
                </div>
            );
        }

        return <CheckoutButton productId={productId} />;
    }

    // Nothing to open. A product that bundles no courses is unusual but
    // possible, and a button leading nowhere is worse than a sentence — so this
    // says what is true and stops there.
    //
    // Only ever reached by somebody who bought it. A product with no courses in
    // it has nothing that could be held some other way — `productIsForSale`
    // keeps it on sale until it is purchased — so the wording cannot be shown
    // to someone who does not in fact have the product.
    if (courses.length === 0) {
        return (
            <p className="text-xl tracking-widest text-ink uppercase">
                Ya tienes este producto
            </p>
        );
    }

    // One course means there is no choice to make, so the button skips the
    // choosing entirely and goes straight in. True however they came to hold
    // it — bought here, bought inside a larger bundle, or handed over by an
    // admin: a one-course product IS that course.
    if (courses.length === 1) {
        return (
            <PlaqueButton href={`/courses/${courses[0].id}`}>
                Ir al curso
            </PlaqueButton>
        );
    }

    // Several courses, and nothing here. A single button cannot answer "which
    // one", and one that only scrolls the page down is a step that asks the
    // visitor to act before it tells them anything. The choice belongs where the
    // information to make it already is: each syllabus card below carries its
    // own "Ver curso" link, next to the sections and lessons that distinguish
    // one course from another.
    //
    // Somebody holding only part of the bundle does not land here: for them
    // the product is still for sale, and the buy button above is what they get.
    return null;
}

// Stands in while the checks above run. Shaped like the button it replaces and
// styled after the page's own loading state, so the layout does not jump when
// the real control arrives.
//
// Deliberately not the buy button: using that as the fallback would show
// "Comprar ahora" to someone who already owns the product and then swap it,
// which reads as a mistake being corrected.
export function ProductCallToActionSkeleton({
    // Whether to stand in for a row of two plaques rather than one. How many
    // courses a product bundles is cached data the page already holds, and it
    // does not depend on who is asking — so the fallback can be the right shape
    // from the first frame instead of sprouting a second button when the
    // ownership check comes back.
    withCourseLink = false,
}: {
    withCourseLink?: boolean;
}) {
    return (
        <div className="flex w-full animate-pulse flex-col-reverse gap-4 sm:w-auto sm:flex-row">
            <SkeletonPlaque />
            {withCourseLink && <SkeletonPlaque />}
        </div>
    );
}

// Full width while stacked and fixed from `sm` up, which is what the plaques
// themselves do — a fallback narrower than its button is a jump on a phone.
function SkeletonPlaque() {
    return (
        <div
            className="h-14 w-full bg-gold/10 sm:w-48"
            style={{ clipPath: bevelFace(10) }}
        />
    );
}
