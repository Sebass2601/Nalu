import { describe, expect, it } from "vitest";
import { authErrorMessage } from "./authErrorMessage";

describe("authErrorMessage", () => {
    it("says nothing when there is no error", () => {
        expect(authErrorMessage(undefined)).toBeNull();
        expect(authErrorMessage("")).toBeNull();
    });

    it("explains the email-and-password account, and offers a reset", () => {
        const notice = authErrorMessage("OAuthAccountNotLinked");

        expect(notice?.message).toMatch(/creada con contraseña/);
        expect(notice?.offerPasswordReset).toBe(true);
    });

    it("refuses a deleted account without offering a reset", () => {
        expect(authErrorMessage("AccessDenied")?.offerPasswordReset).toBe(false);
    });

    // The parameter is typed by whoever wrote the URL. It may pick a message,
    // never become one.
    it("never echoes an unknown code back", () => {
        const notice = authErrorMessage("<script>alert(1)</script>");

        expect(notice?.message).not.toContain("script");
        expect(notice?.message).toMatch(/Inténtalo de nuevo/);
    });

    it("ignores a repeated parameter", () => {
        expect(authErrorMessage(["OAuthAccountNotLinked", "x"])).toBeNull();
    });
});
