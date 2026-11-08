import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Cinzel } from "next/font/google";
import "./globals.css";
import { Toaster } from "sonner";
import { JsonLd } from "@/components/JsonLd";
import { Suspense } from "react";
import { Analytics } from "@/components/analytics/Analytics";
import {
  SITE_DESCRIPTION,
  SITE_NAME,
  SITE_TITLE,
  SITE_URL,
} from "@/lib/pageMetadata";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// The one description every share, search result and AI summary quotes when a
// page has none of its own. It lives in `@/lib/pageMetadata` with the other
// site-wide values, so the pages that describe themselves and this fallback
// read the same words.
const DESCRIPTION = SITE_DESCRIPTION;

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
  metadataBase: new URL(SITE_URL),

  title: {
    // What a page inherits when it names no title of its own — the home page,
    // and the account and checkout screens nobody arrives at from a search.
    default: SITE_TITLE,
    // And what a page that *does* name one gets wrapped in, so a lesson reads
    // "Introducción · Nalu Escuela" rather than losing the brand entirely.
    template: `%s · ${SITE_NAME}`,
  },
  description: DESCRIPTION,

  // The preview card for everything that reads Open Graph — which is most of
  // the web: Facebook, Instagram, WhatsApp, LinkedIn, Telegram, Discord, Slack,
  // iMessage. There is no per-network tag to write; they all read these.
  //
  // No `url` here, on purpose. Whatever this layout sets, every page without
  // its own `openGraph` inherits — and a `url` of the home page would tell
  // Facebook that a shared course link is really the home page, and draw the
  // home page's card for it. The public pages set their own through
  // `pageMetadata`; anything else is left for the reader to take from the
  // address it actually fetched.
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    title: SITE_TITLE,
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
    title: SITE_TITLE,
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

  // No `alternates.canonical` here either, for the same reason as `openGraph.url`
  // above, and with higher stakes: the canonical tag tells Google which URL is
  // the real copy of a page. Set here to "/", it was inherited by every page —
  // so every course page told Google it was a duplicate of the home page and
  // should not be listed in its own right. Each public page now names its own
  // address through `pageMetadata` in `@/lib/pageMetadata`.

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
// Written into the page by `JsonLd`, which every page with structured data uses —
// including the course pages, whose values do come from the database and so
// need the escaping it applies.
const structuredData = {
  "@context": "https://schema.org",
  "@type": "EducationalOrganization",
  name: SITE_NAME,
  alternateName: "Reino de Nalu",
  url: SITE_URL,
  logo: `${SITE_URL}/nalu_logo.png`,
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
        <JsonLd data={structuredData} />
        {children}
        {/* Top-centre rather than sonner's bottom-right default, which is
            where the contact mark now lives. A toast landing on top of a fixed
            button covers it and steals the taps meant for it. */}
        <Toaster position="top-center" />
        {/* Google Analytics — straight away for most visitors, behind the
            cookie notice for those in Europe; see `Analytics`. In its own
            boundary because it reads the visitor's country from the request,
            and nothing else on the page should wait for that. */}
        <Suspense fallback={null}>
          <Analytics />
        </Suspense>
      </body>
    </html>
  );
}
