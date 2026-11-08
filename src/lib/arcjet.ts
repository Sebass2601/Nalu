import arcjet, { shield, detectBot, slidingWindow } from "@arcjet/next";

// Single, shared Arcjet client. Configuring it once here (rather than per route)
// keeps the rules in one place and lets any route handler or server action reuse
// `aj` later. `protect()` sends request metadata to Arcjet's decision API and
// returns a verdict; the caller decides what to do with a denial.
//
// All rules run in "LIVE" mode, meaning Arcjet actually blocks. Switch any rule
// to "DRY_RUN" to log a would-be block without enforcing it.
export const aj = arcjet({
    // `ARCJET_KEY` is read from .env at runtime (Proxy uses the Node.js runtime).
    key: process.env.ARCJET_KEY!,
    rules: [
        // 1. Shield — WAF-style protection against common web attacks
        //    (SQL injection, XSS, and the rest of the OWASP Top 10).
        shield({ mode: "LIVE" }),

        // 2. Bot detection — block automated clients. `allow` is an allow-list,
        //    so everything NOT listed here is denied. We permit the three
        //    benign categories requested: search-engine crawlers (Google/Bing),
        //    uptime monitors, and link-preview fetchers (Slack/Discord/etc).
        //
        //    TEMPORARILY "DRY_RUN" (since 2026-11-08): every bot is let through
        //    while the site is being audited and indexed. Arcjet still
        //    classifies each request and records what it would have blocked,
        //    but blocks nothing. Set back to "LIVE" to restore the allow-list
        //    below. Shield and the auth-route rate limit stay LIVE meanwhile.
        detectBot({
            mode: "DRY_RUN",
            allow: [
                "CATEGORY:SEARCH_ENGINE",
                "CATEGORY:MONITOR",
                "CATEGORY:PREVIEW",
                // --- AI discoverability bots -------------------------------
                "OPENAI_CRAWLER_SEARCH", // OAI-SearchBot — ChatGPT search index
                "OPENAI_CRAWLER_USER", // ChatGPT-User — live fetch on user request
                "PERPLEXITY_USER", // Perplexity — live fetch on user request
                "ANTHROPIC_CRAWLER", // ClaudeBot — Anthropic's only bot identifier
            ],
        }),
    ],
});

// A stricter client for SENSITIVE routes only (login / sign-up). It layers a
// sliding-window rate limit on top of the shared shield + bot rules via
// `withRule`, so normal page browsing is never rate-limited — only the routes
// most exposed to brute-force and spam abuse. At most 100 requests per 60s,
// tracked per client (IP by default).
export const ajSensitive = aj.withRule(
    slidingWindow({
        mode: "LIVE",
        interval: "60s",
        max: 100,
    })
);
