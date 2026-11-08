import { describe, expect, it } from "vitest";
import { courseStructuredData } from "./courseStructuredData";

const NOW = new Date("2026-11-08T12:00:00Z");
const TOMORROW = new Date("2026-11-09T12:00:00Z");

const product = {
    id: "p1",
    name: "Tarot Evolutivo",
    description: "Aprende a leer el tarot.",
    imageUrl: "https://example.ufs.sh/f/cover.png",
    priceInDollars: 100,
    promoOfferCode: null,
    promoPriceInDollars: null,
    promoEndsAt: null,
    courses: [
        {
            name: "Tarot Evolutivo",
            courseSections: [
                { name: "Los Arcanos Mayores" },
                { name: "Las tiradas" },
            ],
        },
    ],
};

describe("courseStructuredData", () => {
    it("describes the product as an online Spanish course by Nalu Escuela", () => {
        const data = courseStructuredData(product);

        expect(data).toMatchObject({
            "@context": "https://schema.org",
            "@type": "Course",
            name: "Tarot Evolutivo",
            description: "Aprende a leer el tarot.",
            url: "https://naluescuela.com/products/p1",
            image: "https://example.ufs.sh/f/cover.png",
            inLanguage: "es",
            provider: {
                "@type": "EducationalOrganization",
                name: "Nalu Escuela",
                url: "https://naluescuela.com",
            },
            hasCourseInstance: {
                "@type": "CourseInstance",
                courseMode: "Online",
            },
        });
    });

    it("offers it at the base price in dollars when no promotion runs", () => {
        expect(courseStructuredData(product).offers).toEqual({
            "@type": "Offer",
            price: 100,
            priceCurrency: "USD",
            category: "Paid",
            availability: "https://schema.org/InStock",
            url: "https://naluescuela.com/products/p1",
        });
    });

    it("offers the promotional price while a promotion is live", () => {
        const onSale = {
            ...product,
            promoOfferCode: "promo",
            promoPriceInDollars: 80,
            promoEndsAt: TOMORROW,
        };

        expect(courseStructuredData(onSale, NOW).offers.price).toBe(80);
    });

    it("calls a zero price free", () => {
        const free = { ...product, priceInDollars: 0 };

        expect(courseStructuredData(free).offers.category).toBe("Free");
    });

    it("lists a single course's sections directly as the syllabus", () => {
        const data = courseStructuredData(product);

        expect(data.syllabusSections).toEqual([
            { "@type": "Syllabus", name: "Los Arcanos Mayores" },
            { "@type": "Syllabus", name: "Las tiradas" },
        ]);
        expect(data.hasPart).toBeUndefined();
    });

    it("lists each bundled course as a part, with its own sections", () => {
        const bundle = {
            ...product,
            courses: [
                { name: "Numerología I", courseSections: [{ name: "Los números" }] },
                { name: "Numerología II", courseSections: [{ name: "Los ciclos" }] },
            ],
        };

        const data = courseStructuredData(bundle);

        expect(data.syllabusSections).toBeUndefined();
        expect(data.hasPart).toEqual([
            {
                "@type": "Course",
                name: "Numerología I",
                syllabusSections: [{ "@type": "Syllabus", name: "Los números" }],
            },
            {
                "@type": "Course",
                name: "Numerología II",
                syllabusSections: [{ "@type": "Syllabus", name: "Los ciclos" }],
            },
        ]);
    });
});
