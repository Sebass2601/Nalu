import { describe, expect, it } from "vitest";
import {
    RESET_LINK_PATH,
    emailFromResetIdentifier,
    generateResetToken,
    hashResetToken,
    passwordResetEmail,
    resetIdentifier,
    resetLink,
} from "./passwordReset";

describe("generateResetToken", () => {
    it("is long, URL-safe, and different every time", () => {
        const a = generateResetToken();
        const b = generateResetToken();

        // 32 bytes in base64url, without padding.
        expect(a).toHaveLength(43);
        expect(a).toMatch(/^[A-Za-z0-9_-]+$/);
        expect(a).not.toBe(b);
    });
});

describe("hashResetToken", () => {
    it("is stable, and never the key itself", () => {
        const token = generateResetToken();

        expect(hashResetToken(token)).toBe(hashResetToken(token));
        expect(hashResetToken(token)).not.toContain(token);
        expect(hashResetToken(token)).toMatch(/^[0-9a-f]{64}$/);
    });
});

describe("reset identifiers", () => {
    it("round-trip an email", () => {
        const identifier = resetIdentifier("maria@gmail.com");

        expect(emailFromResetIdentifier(identifier)).toBe("maria@gmail.com");
    });

    // Auth.js writes its own email sign-in rows to the same table, keyed on
    // the bare address. Those must never be read as a reset.
    it("refuse a bare email, as Auth.js would store one", () => {
        expect(emailFromResetIdentifier("maria@gmail.com")).toBeNull();
    });
});

describe("resetLink", () => {
    it("points at the configured site, on the link route", () => {
        const link = new URL(resetLink("https://naluescuela.com", "abc_-123"));

        expect(link.origin).toBe("https://naluescuela.com");
        expect(link.pathname).toBe(RESET_LINK_PATH);
        expect(link.searchParams.get("token")).toBe("abc_-123");
    });

    it("ignores any path on the configured address", () => {
        const link = new URL(resetLink("http://localhost:3000/algo", "t"));

        expect(link.origin).toBe("http://localhost:3000");
        expect(link.pathname).toBe(RESET_LINK_PATH);
    });
});

describe("passwordResetEmail", () => {
    const link = "https://naluescuela.com/restablecer-contrasena/enlace?token=abc";

    it("carries the link in both bodies", () => {
        const email = passwordResetEmail({ name: "María", link });

        expect(email.text).toContain(link);
        expect(email.html).toContain("María");
        expect(email.subject).toMatch(/contraseña/);
    });

    // The name is free text from sign-up. Unescaped, it could put markup — a
    // link of someone else's choosing — inside an email we really send.
    it("escapes the name", () => {
        const email = passwordResetEmail({
            name: '<a href="https://evil.example">clic</a>',
            link,
        });

        expect(email.html).not.toContain('<a href="https://evil.example">');
        expect(email.html).toContain("&lt;a href=&quot;https://evil.example&quot;&gt;");
    });

    it("escapes the ampersands a link's query can contain", () => {
        const email = passwordResetEmail({
            name: "Ana",
            link: "https://naluescuela.com/x?a=1&b=2",
        });

        expect(email.html).toContain("a=1&amp;b=2");
    });
});
