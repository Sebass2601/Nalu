import { describe, expect, test } from "vitest";
import { productIsForSale } from "./productForSale";

const A = "course-a";
const B = "course-b";
const C = "course-c";

describe("productIsForSale", () => {
    test("is for sale to someone who holds none of its courses", () => {
        expect(
            productIsForSale({
                ownsProduct: false,
                productCourseIds: [A, B],
                ownedCourseIds: [],
            })
        ).toBe(true);
    });

    // The half the old rule got wrong for hand-granted access: one course out
    // of a bundle used to take the buy button away, leaving no way to pay for
    // the rest.
    test("is for sale to someone who holds only part of the bundle", () => {
        expect(
            productIsForSale({
                ownsProduct: false,
                productCourseIds: [A, B],
                ownedCourseIds: [A],
            })
        ).toBe(true);
    });

    test("is not for sale to someone who holds every course in it", () => {
        expect(
            productIsForSale({
                ownsProduct: false,
                productCourseIds: [A, B],
                ownedCourseIds: [A, B],
            })
        ).toBe(false);
    });

    // The half it got wrong for buyers: someone who bought A + B was still
    // offered the product selling B alone, and could pay for nothing.
    test("is not for sale when its courses are a subset of what they hold", () => {
        expect(
            productIsForSale({
                ownsProduct: false,
                productCourseIds: [B],
                ownedCourseIds: [A, B, C],
            })
        ).toBe(false);
    });

    test("courses held outside the product do not stand in for missing ones", () => {
        expect(
            productIsForSale({
                ownsProduct: false,
                productCourseIds: [A, B],
                ownedCourseIds: [A, C],
            })
        ).toBe(true);
    });

    test("does not depend on the order the courses are listed in", () => {
        expect(
            productIsForSale({
                ownsProduct: false,
                productCourseIds: [A, B],
                ownedCourseIds: [B, A],
            })
        ).toBe(false);
    });

    // A course added to a product after somebody bought it leaves them without
    // that course. Charging them a second time for the same product is not the
    // way to hand it over, so the purchase settles the question on its own.
    test("is not for sale to someone who bought this product, whatever they hold", () => {
        expect(
            productIsForSale({
                ownsProduct: true,
                productCourseIds: [A, B],
                ownedCourseIds: [A],
            })
        ).toBe(false);
    });

    // "Holds every course" is true of an empty list for everybody. Read
    // literally it would take a product with no courses off sale for the whole
    // world, so only buying it does.
    test("a product bundling no courses is for sale until it is bought", () => {
        expect(
            productIsForSale({
                ownsProduct: false,
                productCourseIds: [],
                ownedCourseIds: [A],
            })
        ).toBe(true);
        expect(
            productIsForSale({
                ownsProduct: true,
                productCourseIds: [],
                ownedCourseIds: [],
            })
        ).toBe(false);
    });
});
