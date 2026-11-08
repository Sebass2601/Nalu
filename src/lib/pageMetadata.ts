import type { Metadata } from "next";
// The same 1200x630 card `app/opengraph-image.png` and `app/twitter-image.png`
// serve (the two files are identical).
import siteShareImage from "@/app/opengraph-image.png";

// The site's identity, shared by the root layout's tags, its JSON-LD, and every
// page that describes itself through `pageMetadata` below.
export const SITE_URL = "https://naluescuela.com";
export const SITE_NAME = "Nalu Escuela";
export const SITE_TITLE = "Nalu · Escuela de Cursos Holísticos Online";
export const SITE_DESCRIPTION =
    "Escuela online de cursos holísticos de numerología, tarot, sigilos, energías, servidores mágicos, arquetipos, magia draconiana, magia de espejos, magia del tiempo y realidad cuántica. Aprende a tu ritmo en el Reino de Nalu de forma inmersiva y dinámica.";

// The preview-card fields that are the same on every page. Spread into each
// page's `openGraph` rather than inherited from the root layout, because Next
// merges metadata *shallowly*: a page that sets `openGraph` at all replaces the
// layout's whole `openGraph` object, so anything it does not restate is lost.
const SHARED_OPEN_GRAPH = {
    type: "website",
    siteName: SITE_NAME,
    locale: "es_ES",
} as const;

// Everything a public page says about itself to search engines and to the apps
// that draw link previews: its title, its description, its address, and
// optionally its own picture.
//
// The address is the reason this exists. `alternates.canonical` tells Google
// which URL is the real one for this content, and `openGraph.url` tells
// Facebook/WhatsApp/Instagram the same thing. Both used to be set once, in the
// root layout, to "/" — and since every page inherits what it does not
// override, every course page was declaring itself a copy of the home page.
// The layout no longer sets either; each public page names its own path here.
//
// `title` is the page's own name ("Tarot Evolutivo"); the layout's template
// turns it into "Tarot Evolutivo · Nalu Escuela" for the browser tab. The
// preview cards do not get that template applied, so the full form is built
// here for them. Omit `title` for the home page, which uses the site title.
export function pageMetadata({
    path,
    title,
    description = SITE_DESCRIPTION,
    image,
}: {
    path: string;
    title?: string;
    description?: string;
    image?: string;
}): Metadata {
    const fullTitle = title == null ? SITE_TITLE : `${title} · ${SITE_NAME}`;
    // The page's own picture, or else the site-wide share card. The fallback
    // has to be stated here: `app/opengraph-image.png` is only filled in for
    // pages that leave `openGraph` alone, and the shallow merge above means
    // a page that sets it loses that image unless it names one itself.
    // Imported rather than written as a path so the width and height come
    // from the file, not from numbers someone has to keep in step with it.
    const images = {
        images: [
            image ?? {
                url: siteShareImage.src,
                width: siteShareImage.width,
                height: siteShareImage.height,
            },
        ],
    };

    return {
        ...(title == null ? {} : { title }),
        description,
        alternates: { canonical: path },
        openGraph: {
            ...SHARED_OPEN_GRAPH,
            url: path,
            title: fullTitle,
            description,
            ...images,
        },
        twitter: {
            card: "summary_large_image",
            title: fullTitle,
            description,
            ...images,
        },
    };
}
