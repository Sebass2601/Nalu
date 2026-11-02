import { beforeEach, describe, expect, test, vi } from "vitest";

const { getCurrentUser, updateStatuses } = vi.hoisted(() => ({
    getCurrentUser: vi.fn(),
    updateStatuses: vi.fn(),
}));

vi.mock("../../users/actions/currentUser", () => ({ getCurrentUser }));
vi.mock("../db/lessons", () => ({
    updateSectionLessonStatuses: updateStatuses,
}));

import { updateSectionLessonStatuses } from "./lessons";

const sectionId = "3f2b8c1e-5a4d-4e6f-9b7a-1c2d3e4f5a6b";

describe("updateSectionLessonStatuses", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        getCurrentUser.mockResolvedValue({ role: "admin" });
        updateStatuses.mockResolvedValue([{ id: "lesson" }]);
    });

    test.each(["public", "private", "preview"] as const)(
        "an admin can set a whole class to %s",
        async status => {
            const result = await updateSectionLessonStatuses({ sectionId, status });

            expect(result.error).toBe(false);
            expect(updateStatuses).toHaveBeenCalledWith(sectionId, status);
        }
    );

    // A preview lesson is free to watch, so this is what stops anyone but an
    // admin from opening a paid class. Server actions are public endpoints: the
    // admin page hiding the button is not what protects them.
    test.each([{ role: "user" }, { role: undefined }])(
        "nothing changes for a non-admin ($role)",
        async user => {
            getCurrentUser.mockResolvedValue(user);

            const result = await updateSectionLessonStatuses({
                sectionId,
                status: "preview",
            });

            expect(result.error).toBe(true);
            expect(updateStatuses).not.toHaveBeenCalled();
        }
    );

    test("an unknown status is rejected", async () => {
        const result = await updateSectionLessonStatuses({
            sectionId,
            status: "archived" as "public",
        });

        expect(result.error).toBe(true);
        expect(updateStatuses).not.toHaveBeenCalled();
    });

    test("a malformed class id is rejected", async () => {
        const result = await updateSectionLessonStatuses({
            sectionId: "not-a-uuid",
            status: "public",
        });

        expect(result.error).toBe(true);
        expect(updateStatuses).not.toHaveBeenCalled();
    });

    test("a class with no lessons reports an error instead of success", async () => {
        updateStatuses.mockResolvedValue([]);

        const result = await updateSectionLessonStatuses({
            sectionId,
            status: "public",
        });

        expect(result.error).toBe(true);
    });
});
