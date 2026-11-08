import { SITE_NAME, SITE_URL } from "@/lib/pageMetadata";
import { displayPrice, type PromoPriceFields } from "./promoOffer";

// What a product page says about itself in schema.org terms: a course, given
// online in Spanish by Nalu Escuela, at this price, covering these sections.
//
// Read by machines rather than people — search engines and AI assistants parse
// it to know *what kind of thing* the page sells, instead of inferring it from
// the prose. Google itself stopped drawing a special "course" result from this
// in 2025, so it is no longer a way to change how a listing looks there; what
// remains is being understood correctly by everything that reads the page.
//
// It is visible to anyone who opens the page source, so it carries only what
// the page already shows a visitor without an account: the name, description,
// cover, price and section titles. Never lesson content, nor anything private.
//
// The price is `displayPrice` — the same number drawn on the page, promotion
// included — so the two cannot disagree. In dollars, the base currency: the
// regional prices a visitor may see are adjustments to it, not other offers.
// `now` goes straight through to it, and is only read when a promotion has an
// end date, exactly as on the page.

type SyllabusCourse = {
    name: string;
    courseSections: { name: string }[];
};

type CourseProduct = PromoPriceFields & {
    id: string;
    name: string;
    description: string;
    imageUrl: string;
    courses: SyllabusCourse[];
};

export function courseStructuredData(product: CourseProduct, now?: Date) {
    const url = `${SITE_URL}/products/${product.id}`;
    const { priceInDollars } = displayPrice(product, now);

    // One course: its sections are this course's syllabus. Several: each
    // bundled course is a part of this one, with its own sections, so a bundle
    // is not flattened into one list where nobody can tell which course a
    // section belongs to. Whichever does not apply is left undefined, and
    // `JSON.stringify` drops it from the page.
    const isBundle = product.courses.length > 1;
    const [onlyCourse] = product.courses;

    return {
        "@context": "https://schema.org",
        "@type": "Course",
        name: product.name,
        description: product.description,
        url,
        image: product.imageUrl,
        inLanguage: "es",
        provider: {
            "@type": "EducationalOrganization",
            name: SITE_NAME,
            url: SITE_URL,
        },
        offers: {
            "@type": "Offer",
            price: priceInDollars,
            priceCurrency: "USD",
            category: priceInDollars === 0 ? "Free" : "Paid",
            availability: "https://schema.org/InStock",
            url,
        },
        hasCourseInstance: {
            "@type": "CourseInstance",
            courseMode: "Online",
        },
        syllabusSections:
            !isBundle && onlyCourse != null
                ? syllabusSections(onlyCourse)
                : undefined,
        hasPart: isBundle
            ? product.courses.map(course => ({
                  "@type": "Course",
                  name: course.name,
                  syllabusSections: syllabusSections(course),
              }))
            : undefined,
    };
}

function syllabusSections(course: SyllabusCourse) {
    return course.courseSections.map(section => ({
        "@type": "Syllabus",
        name: section.name,
    }));
}
