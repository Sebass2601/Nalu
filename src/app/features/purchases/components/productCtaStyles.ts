// The look of every call to action on a product page, in one place.
//
// A product page can show three different controls in the same role — "Comprar
// ahora", "Ir al curso" and the per-course "Ver curso" — and which one appears
// depends on whether the visitor already owns the product. They are rendered by
// three separate components, so without a shared definition the styling drifts
// the moment one of them is touched and the page starts looking like two
// different designs stitched together.
//
// They are also not the same element: the buy control is a <button> inside a
// form, the others are <Link>s. Sharing the class string is what keeps that
// difference invisible to the person looking at the page.

// The main control, sitting under the product description.
export const productCtaClassName =
    "w-full cursor-pointer rounded-lg border border-yellow-200/60 px-8 py-4 text-lg tracking-widest text-yellow-200 uppercase transition-colors hover:bg-yellow-200 hover:text-[#0a1628] sm:w-auto";

// The same control scaled down for a syllabus card, where it is one of several
// on screen and must not compete with the main one above.
export const courseCtaClassName =
    "inline-block cursor-pointer rounded-lg border border-yellow-200/60 px-5 py-2 text-sm tracking-widest text-yellow-200 uppercase transition-colors hover:bg-yellow-200 hover:text-[#0a1628]";
