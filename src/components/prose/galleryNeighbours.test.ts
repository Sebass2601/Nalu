import { describe, expect, test } from "vitest";
import { galleryNeighbourIndexes } from "./galleryNeighbours";

describe("galleryNeighbourIndexes", () => {
    test("a single image has no neighbours to fetch ahead", () => {
        expect(galleryNeighbourIndexes(0, 1)).toEqual([]);
    });

    test("two images give one neighbour, not the same one twice", () => {
        // Both arrows lead to the other image, and fetching it twice would
        // put two identical requests on the wire.
        expect(galleryNeighbourIndexes(0, 2)).toEqual([1]);
        expect(galleryNeighbourIndexes(1, 2)).toEqual([0]);
    });

    test("returns the next image before the previous one", () => {
        // Both get fetched, but a reader moving through a gallery goes
        // forwards far more often than back, so the forwards one is asked
        // for first and wins the race for the connection.
        expect(galleryNeighbourIndexes(1, 3)).toEqual([2, 0]);
    });

    test("wraps at both ends, the way the arrows do", () => {
        expect(galleryNeighbourIndexes(4, 5)).toEqual([0, 3]);
        expect(galleryNeighbourIndexes(0, 5)).toEqual([1, 4]);
    });

    test("fetches only the two adjacent images however long the gallery is", () => {
        // The point of the window: a twenty-image lesson must not pull twenty
        // images over the network to show one.
        expect(galleryNeighbourIndexes(10, 20)).toEqual([11, 9]);
    });

    test("never returns the image already on screen", () => {
        for (let total = 1; total <= 8; total++) {
            for (let index = 0; index < total; index++) {
                expect(galleryNeighbourIndexes(index, total)).not.toContain(
                    index
                );
            }
        }
    });
});
