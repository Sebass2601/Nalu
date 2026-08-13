import type { MetadataRoute } from "next";

// The other half of "let the AI crawlers in".
//
// The `robots` meta tag in layout.tsx governs what a crawler may *do* with a
// page once it has it — index it, quote it at length, show a large image. This
// file governs whether it is allowed to fetch the page at all, and it is the
// only one of the two that the assistant crawlers check first: GPTBot,
// ClaudeBot, PerplexityBot, Google-Extended and the rest read robots.txt by
// name and stay out of anything it does not permit. Without a robots.txt most
// default to crawling anyway, but "most" and "by default" are not a policy —
// this makes the invitation explicit, which is the difference between being
// summarised accurately and being summarised from whatever a third party
// happened to cache.
//
// Every one of them is covered by the single `*` rule. Naming them one by one
// is a list that goes stale every time a new one appears, and each new arrival
// would be silently ungoverned until someone updated it. The rules are the same
// for all of them, so there is nothing a per-agent list would say differently.
export default function robots(): MetadataRoute.Robots {
    return {
        rules: {
            userAgent: "*",
            allow: "/",
            // Not secrets — every one of these already refuses a request
            // without the right session, and that check is what actually
            // protects them. This is about what belongs in an index: an admin
            // console and a personal receipt log are not pages anyone should
            // arrive at from a search result, and a crawler spending its
            // budget on them is budget not spent on the courses.
            disallow: ["/api/", "/admin", "/profile", "/purchases"],
        },
        // Where the catalogue is listed. robots.txt is the one file every
        // crawler fetches unprompted, so naming the sitemap here is how it gets
        // found without anyone submitting it anywhere.
        sitemap: "https://naluescuela.com/sitemap.xml",
    };
}
