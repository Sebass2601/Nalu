import { createHash, randomBytes } from "node:crypto";

// The pure half of password reset: making the one-time key, turning it into
// what is stored, and writing the email that carries it. No database and no
// network here, so every rule below can be tested on its own. The half that
// touches storage is ../db/passwordReset.ts.

// How long a link works. Long enough to find the email, short enough that an
// old message sitting in an inbox is not a standing way into the account.
export const RESET_TOKEN_TTL_MS = 60 * 60 * 1000;

// How soon the same address may be sent another link. Each request otherwise
// costs a real email, and the form takes any address — without this, it is a
// free machine for filling a stranger's inbox (and burning the 100-a-day free
// Resend allowance). Short enough that someone whose first email went astray
// is not left waiting.
export const RESET_RESEND_COOLDOWN_MS = 2 * 60 * 1000;

// Where the email's link lands. A route handler, not the page: it moves the
// key out of the address bar before the page — and the Google Analytics tag
// on every page — ever sees it. See src/app/(auth)/restablecer-contrasena/enlace/route.ts.
export const RESET_LINK_PATH = "/restablecer-contrasena/enlace";
export const RESET_PAGE_PATH = "/restablecer-contrasena";

// The cookie that carries the key from that route to the page's form.
export const RESET_COOKIE = "nalu-password-reset";

// Rows in `verification_tokens` are shared with Auth.js, which writes its own
// there for email sign-in. Prefixing ours keeps the two from ever answering for
// each other: an Auth.js login token can never be spent as a reset, nor the
// reverse.
const IDENTIFIER_PREFIX = "password-reset:";

export function resetIdentifier(email: string) {
    return `${IDENTIFIER_PREFIX}${email}`;
}

export function emailFromResetIdentifier(identifier: string) {
    return identifier.startsWith(IDENTIFIER_PREFIX)
        ? identifier.slice(IDENTIFIER_PREFIX.length)
        : null;
}

export function isResetIdentifier(identifier: string) {
    return identifier.startsWith(IDENTIFIER_PREFIX);
}

// 32 random bytes — 256 bits, the same strength as the key that signs every
// session. Nobody guesses that, so no attempt counter is needed on the
// redeeming side. base64url because it survives a URL untouched: no "+", "/"
// or "=" for an email client to mangle.
export function generateResetToken() {
    return randomBytes(32).toString("base64url");
}

// What the database stores instead of the key itself, for the same reason
// passwords are stored hashed: whoever reads a copy of the table should not be
// able to use what they read. A plain SHA-256 is enough here — a slow hash
// like bcrypt exists to protect weak, guessable passwords, and this key is
// neither.
export function hashResetToken(token: string) {
    return createHash("sha256").update(token).digest("hex");
}

// The link sent in the email. `siteUrl` must come from configuration, never
// from the incoming request — see AUTH_URL in src/data/env/server.ts.
export function resetLink(siteUrl: string, token: string) {
    const url = new URL(RESET_LINK_PATH, siteUrl);
    url.searchParams.set("token", token);
    return url.toString();
}

// The email itself. Plain, inline-styled HTML — mail clients ignore
// stylesheets — plus a text version for clients that show no HTML.
export function passwordResetEmail({ name, link }: { name: string; link: string }) {
    const subject = "Restablece tu contraseña de Nalu";
    const minutes = RESET_TOKEN_TTL_MS / 60_000;

    const text = [
        `Hola, ${name}:`,
        "",
        "Recibimos una solicitud para restablecer la contraseña de tu cuenta de Nalu.",
        "Abre este enlace para elegir una nueva:",
        "",
        link,
        "",
        `El enlace funciona una sola vez y caduca en ${minutes} minutos.`,
        "",
        "Si no pediste este cambio, ignora este email: tu contraseña sigue igual.",
        "",
        "— Nalu",
    ].join("\n");

    const html = `<!DOCTYPE html>
<html lang="es">
<body style="margin:0;padding:24px;background:#f4f1ea;font-family:Georgia,'Times New Roman',serif;color:#1d2433;">
  <div style="max-width:480px;margin:0 auto;background:#ffffff;border-radius:12px;padding:32px;border:1px solid #e3dccb;">
    <p style="font-size:16px;margin:0 0 16px;">Hola, ${escapeHtml(name)}:</p>
    <p style="font-size:16px;line-height:1.5;margin:0 0 24px;">
      Recibimos una solicitud para restablecer la contraseña de tu cuenta de Nalu.
    </p>
    <p style="text-align:center;margin:0 0 24px;">
      <a href="${escapeHtml(link)}"
         style="display:inline-block;background:#face49;color:#0a1628;text-decoration:none;font-weight:bold;letter-spacing:1px;padding:12px 24px;border-radius:6px;">
        Elegir nueva contraseña
      </a>
    </p>
    <p style="font-size:14px;line-height:1.5;color:#4a5263;margin:0 0 16px;">
      El enlace funciona una sola vez y caduca en ${minutes} minutos.
      Si el botón no funciona, copia esta dirección en tu navegador:<br>
      <span style="word-break:break-all;">${escapeHtml(link)}</span>
    </p>
    <p style="font-size:14px;line-height:1.5;color:#4a5263;margin:0;">
      Si no pediste este cambio, ignora este email: tu contraseña sigue igual.
    </p>
  </div>
</body>
</html>`;

    return { subject, html, text };
}

// The name is whatever the person typed at sign-up, and it is about to be
// pasted into HTML. Unescaped, a name like `<a href="...">` would put a link of
// the author's choosing inside an email that genuinely comes from us.
function escapeHtml(value: string) {
    return value
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#39;");
}
