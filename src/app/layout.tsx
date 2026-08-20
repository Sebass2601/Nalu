import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Cinzel } from "next/font/google";
import "./globals.css";
import { Toaster } from "sonner";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// The one description every share, search result and AI summary quotes. Kept
// as a constant because it has to be identical in three places — the plain
// `description`, Open Graph and Twitter — and three copies of a paragraph drift.
const DESCRIPTION =
  "Escuela online de cursos holísticos de numerología, tarot, sigilos, energías, servidores mágicos, arquetipos, magia draconiana, magia de espejos, magia del tiempo y realidad cuántica. Aprende a tu ritmo en el Reino de Nalu de forma inmersiva y dinámica.";

const SITE_NAME = "Nalu Escuela";

export const metadata: Metadata = {
  // Every URL in the tags below has to be absolute — a crawler reading
  // `/opengraph-image.png` on Facebook's servers has nothing to resolve it
  // against. `metadataBase` is what Next composes the relative ones with, and
  // without it a relative image is a build error.
  //
  // Hardcoded to the public domain on purpose. It is the address being shared,
  // whichever machine rendered the page: the Hetzner container knows itself as
  // 0.0.0.0 and Vercel as a preview subdomain, and neither belongs in a link
  // preview.
  metadataBase: new URL("https://naluescuela.com"),

  title: {
    // What a page inherits when it names no title of its own — which is every
    // page today, so this is the tab title across the site.
    default: "Nalu · Escuela de Cursos Holísticos Online",
    // And what a page that *does* name one gets wrapped in, so a lesson reads
    // "Introducción · Nalu Escuela" rather than losing the brand entirely.
    template: `%s · ${SITE_NAME}`,
  },
  description: DESCRIPTION,

  // The preview card for everything that reads Open Graph — which is most of
  // the web: Facebook, Instagram, WhatsApp, LinkedIn, Telegram, Discord, Slack,
  // iMessage. There is no per-network tag to write; they all read these.
  openGraph: {
    type: "website",
    url: "https://naluescuela.com",
    siteName: SITE_NAME,
    title: "Nalu · Escuela de Cursos Holísticos Online",
    description: DESCRIPTION,
    locale: "es_ES",
    // Images are deliberately absent here. `app/opengraph-image.png` and
    // `app/twitter-image.png` are file conventions: Next hashes them, serves
    // them, and writes og:image with its width, height and type filled in from
    // the file itself. Listing them here as well would mean maintaining those
    // numbers by hand and having them silently disagree the day the art
    // changes.
  },

  // X reads Open Graph as a fallback, but not for the card *shape* — without
  // `card` it renders the small thumbnail variant. `summary_large_image` is
  // what makes the image the width of the tweet, and it is why the share image
  // is composed at 1200x630 with the mark centred rather than being the square
  // logo file itself: X crops a square to that ratio, through the logo.
  twitter: {
    card: "summary_large_image",
    title: "Nalu · Escuela de Cursos Holísticos Online",
    description: DESCRIPTION,
  },

  // Search and AI crawlers are invited in, and told to hold nothing back.
  //
  // The three `max-*` directives are the ones that matter for how this site
  // gets *quoted* rather than whether it is indexed: without them Google caps
  // the snippet it will show, refuses a large image preview, and limits video
  // preview length. `-1` and `large` remove those caps. The same directives are
  // read by the assistant crawlers that build answers out of snippets, so this
  // is most of what "SEO for AI" actually consists of — that, and the
  // structured data below.
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-snippet": -1,
      "max-image-preview": "large",
      "max-video-preview": -1,
    },
  },

  // Tells every crawler which URL is the real one, so the same page reached
  // through a Vercel preview domain or a tracking query string is not counted
  // as a separate, competing copy.
  alternates: {
    canonical: "/",
  },

  // Icons are file conventions too — `app/icon.png` (tab and bookmarks) and
  // `app/apple-icon.png` (iOS home screen). Both are the gold mark from
  // public/nalu_logo.png, the same one the navbar wears, composited onto the
  // site navy rather than left transparent: the logo is a pale gold line
  // drawing, and on the light toolbar of a browser in its default theme a
  // transparent version is nearly invisible. The navy square gives it the
  // contrast it was drawn against and matches the share image below.
  //
  // The generated favicon.ico that shipped with create-next-app was deleted; it
  // would otherwise still win the tab, since browsers ask for /favicon.ico by
  // name.
};

// Structured data: the same facts as the tags above, in the form search engines
// and AI agents parse rather than guess at.
//
// This is the part with no `<meta>` equivalent. Meta tags carry a title and a
// sentence; schema.org JSON-LD says *what kind of thing* this is — an
// educational organization, with a name, a logo, a language and a subject list
// — which is what lets an assistant answer "where can I learn numerology in
// Spanish" with this site rather than merely matching words against it. Google
// documents JSON-LD as its preferred structured-data format, and the AI
// crawlers read the same block.
//
// Injected as a plain <script> because that is how JSON-LD is specified to
// travel. `JSON.stringify` on an object literal, never string concatenation:
// the value is a constant here, but the day any of it comes from the database a
// stray `</script>` in a course title would end the tag early.
const structuredData = {
  "@context": "https://schema.org",
  "@type": "EducationalOrganization",
  name: SITE_NAME,
  alternateName: "Reino de Nalu",
  url: "https://naluescuela.com",
  logo: "https://naluescuela.com/nalu_logo.png",
  description: DESCRIPTION,
  inLanguage: "es",
  knowsAbout: [
    "Numerología",
    "Tarot",
    "Sigilos",
    "Energías",
    "Servidores mágicos",
    "Arquetipos",
    "Magia draconiana",
    "Magia de espejos",
    "Magia del tiempo",
    "Realidad cuántica",
  ],
};

// The browser tints its own chrome (Android status bar, toolbar) with
// `theme-color`; without it those bars stay the browser's default white and
// frame the app in white on mobile. `#0a1628` is the navy both navbars use, so
// the chrome blends into whatever sits directly beneath it.
export const viewport: Viewport = {
  themeColor: "#0a1628",
  colorScheme: "dark",
};

export default async function RootLayout({
  children,
}: Readonly<{children: React.ReactNode;}>) {
  return (
    <html
      lang="es"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      {/* The body's background propagates to the canvas, which is what shows
          through in the gaps no page paints: overscroll bounce, and the sliver
          left while a mobile URL bar animates in or out of `h-dvh`. Set here
          rather than on `--background`, which components also draw with. */}
      <body className="min-h-full flex flex-col bg-[#0a1628]">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
        {children}
        {/* Top-centre rather than sonner's bottom-right default, which is
            where the contact mark now lives. A toast landing on top of a fixed
            button covers it and steals the taps meant for it. */}
        <Toaster position="top-center" />
      </body>
    </html>
  );
}
