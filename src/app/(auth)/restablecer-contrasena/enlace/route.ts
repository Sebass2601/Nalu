import { NextResponse, type NextRequest } from "next/server";
import {
    RESET_COOKIE,
    RESET_PAGE_PATH,
    RESET_TOKEN_TTL_MS,
} from "@/app/features/users/lib/passwordReset";

// The door the reset email's link opens: /restablecer-contrasena/enlace?token=…
//
// It does one thing — move the key from the address bar into a cookie, then
// send the browser on to the page with a clean URL. The reason is everything
// that reads a page's address. The site's Google Analytics tag records the full
// URL of every page view, browser history keeps it, and anyone glancing at the
// screen can read it. A key in the URL of the page itself would end up in all
// three. Here it touches only this response, which renders nothing and loads
// no scripts.
//
// The key is not checked here. That happens on the page (to decide what to
// draw) and in the action (to decide whether to change anything), so this
// route cannot be used to test keys any faster than the page already allows.
export function GET(request: NextRequest) {
    const token = request.nextUrl.searchParams.get("token");

    // A relative Location, not one built from `request.url`: behind the proxy
    // that URL names the container's own socket (https://0.0.0.0:3000 — see
    // the note in src/auth.ts), and the browser resolves a relative one
    // against the address it actually used.
    const response = new NextResponse(null, {
        status: 303,
        headers: {
            Location: RESET_PAGE_PATH,
            // Nothing about this response should be stored or passed on.
            "Cache-Control": "no-store",
            "Referrer-Policy": "no-referrer",
        },
    });

    if (token != null && token.length > 0) {
        response.cookies.set(RESET_COOKIE, token, {
            // Unreadable by the page's own scripts, analytics included.
            httpOnly: true,
            // HTTPS-only in production. Off locally, where the dev server is
            // plain http and a secure cookie would never be sent back.
            secure: process.env.NODE_ENV === "production",
            // "lax" so it is set on the click arriving from the mail client,
            // which is a navigation from another site.
            sameSite: "lax",
            // Sent to the reset page and its form, and nowhere else.
            path: RESET_PAGE_PATH,
            // No point outliving the key itself.
            maxAge: RESET_TOKEN_TTL_MS / 1000,
        });
    }

    return response;
}
