import type { MetadataRoute } from "next";
import { eq } from "drizzle-orm";
import { cacheTag } from "next/cache";
import { db } from "@/drizzle/db";
import { ProductTable } from "@/drizzle/schema";
import { getProductGlobalTag } from "@/app/features/products/db/cache/products";
import { getCategoryGlobalTag } from "@/app/features/categories/db/cache/categories";

const BASE_URL = "https://naluescuela.com";

// The list of pages worth finding, served at /sitemap.xml.
//
// A crawler discovers pages by following links, which means a course reachable
// only through a doorway on the castle artwork is several hops deep and may
// wait weeks to be visited — or never be, if the path to it is a click on an
// image map. A sitemap hands the whole catalogue over directly, and gives each
// URL a `lastModified` so a course edited today is re-crawled rather than
// assumed unchanged.
//
// Deliberately only the public pages. The admin console, the account screens
// and the lesson pages behind a purchase are all excluded — the lessons in
// particular are the product, and a sitemap is an invitation to index. What is
// listed here is what a stranger is meant to arrive at: the salon, the castle,
// the catalogue, and every category and course on sale.
// Rendered per request rather than prerendered — the `new Date()` calls below
// are request-time values, which is what the build means when it marks
// /sitemap.xml dynamic. That is the right trade here and costs nearly nothing:
// the two database queries are behind `"use cache"`, so a crawler hit
// reassembles a list it already holds rather than touching Postgres, while a
// prerendered sitemap would freeze every `lastModified` at build time and tell
// crawlers the site had not changed since the last deploy.
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
    const [products, categories] = await Promise.all([
        getPublicProductRoutes(),
        getCategoryRoutes(),
    ]);

    return [
        // The four doorways a visitor can arrive at without an account.
        // Priorities are relative, not absolute — they say the salon matters
        // more than a category page, nothing more, and Google treats them as a
        // hint at most.
        {
            url: BASE_URL,
            lastModified: new Date(),
            changeFrequency: "weekly",
            priority: 1,
        },
        {
            url: `${BASE_URL}/fetch-courses`,
            lastModified: new Date(),
            changeFrequency: "weekly",
            priority: 0.9,
        },
        {
            url: `${BASE_URL}/products`,
            lastModified: new Date(),
            changeFrequency: "weekly",
            priority: 0.9,
        },
        {
            url: `${BASE_URL}/sobre-nosotros`,
            lastModified: new Date(),
            changeFrequency: "monthly",
            priority: 0.7,
        },
        {
            url: `${BASE_URL}/announcements`,
            lastModified: new Date(),
            changeFrequency: "weekly",
            priority: 0.5,
        },
        ...categories,
        ...products,
    ];

    // /subscribe is not in that list. The plan is not on sale — the navbar
    // doorway to it was taken down for exactly that reason — and a pricing page
    // for something nobody can buy is not a page to send strangers to. It goes
    // back in the day subscriptions do.
}

// Only `status: "public"` products, matching what /products itself shows. A
// private product is a draft: its page exists, but listing it here would put
// unfinished copy in front of the whole web.
//
// `"use cache"` with the same tag the catalogue uses, so an admin publishing a
// course refreshes the sitemap in the same breath as the pages — rather than
// leaving the XML advertising yesterday's catalogue until something happens to
// evict it.
async function getPublicProductRoutes(): Promise<MetadataRoute.Sitemap> {
    "use cache";
    cacheTag(getProductGlobalTag());

    const products = await db.query.ProductTable.findMany({
        where: eq(ProductTable.status, "public"),
        columns: { id: true, updatedAt: true },
    });

    return products.map(product => ({
        url: `${BASE_URL}/products/${product.id}`,
        lastModified: product.updatedAt,
        changeFrequency: "monthly" as const,
        priority: 0.8,
    }));
}

// Every category, because a category page has no public/private of its own —
// it renders whichever public products belong to it, and an empty one is a
// thin page rather than a private one.
async function getCategoryRoutes(): Promise<MetadataRoute.Sitemap> {
    "use cache";
    cacheTag(getCategoryGlobalTag());

    const categories = await db.query.CategoryTable.findMany({
        columns: { id: true, updatedAt: true },
    });

    return categories.map(category => ({
        url: `${BASE_URL}/categories/${category.id}`,
        lastModified: category.updatedAt,
        changeFrequency: "monthly" as const,
        priority: 0.7,
    }));
}
