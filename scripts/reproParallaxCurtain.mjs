// Watches what is actually on screen during a client-side navigation onto a
// parallax page, frame by frame.
//
// Written for one question that static reading could not answer: when you click
// a navbar plaque onto a page whose artwork the browser already holds, does the
// finished scene paint before the loading curtain covers it? A screenshot tool
// cannot answer that — the whole event is under a tenth of a second — so this
// samples the DOM every animation frame and records a screencast alongside it.
//
// Drives the Chrome already installed on the machine rather than downloading
// one, which is why the dependency is `puppeteer-core` and not `puppeteer`.
//
//   pnpm dev                 # in another terminal
//   node scripts/reproParallaxCurtain.mjs
//
// Frames land in `.repro/` and the timeline is printed.

import { mkdir, writeFile, rm } from "node:fs/promises";
import puppeteer from "puppeteer-core";

const ORIGIN = process.env.ORIGIN ?? "http://localhost:3000";
const CHROME = process.env.CHROME ?? "/usr/bin/google-chrome";
const OUT = new URL("../.repro/", import.meta.url).pathname;

// The curtain is the one element on either page carrying `role="status"`.
const CURTAIN = '[role="status"]';

// Installed before any document runs, so it is already watching when the first
// byte of the first page arrives. A client-side navigation does not create a new
// document, so one install covers the whole run — which is the point, since the
// navigation is the thing being measured.
const INSTRUMENT = `
window.__log = [];
window.__mark = (event, detail) => window.__log.push({
    t: Math.round(performance.now()),
    event,
    detail,
});

// Per-frame ground truth: what a person would actually have seen in that frame.
// The MutationObserver below says when nodes changed; this says what was on
// screen, which is the question being asked.
(function sample() {
    const curtain = document.querySelector('${CURTAIN}');
    const layers = document.querySelectorAll('[style*="background-image"]').length;
    const previous = window.__last;
    const now = { curtain: !!curtain, opacity: curtain ? getComputedStyle(curtain).opacity : null, layers };

    if (!previous || previous.curtain !== now.curtain || previous.layers !== now.layers) {
        window.__mark("frame", now);
    }
    window.__last = now;
    requestAnimationFrame(sample);
})();

new MutationObserver((records) => {
    for (const record of records) {
        for (const node of record.addedNodes) {
            if (node.nodeType !== 1) continue;
            if (node.matches?.('${CURTAIN}') || node.querySelector?.('${CURTAIN}')) window.__mark("curtain-added");
            if (node.querySelector?.('[style*="background-image"]')) window.__mark("artwork-added");
        }
        for (const node of record.removedNodes) {
            if (node.nodeType === 1 && (node.matches?.('${CURTAIN}') || node.querySelector?.('${CURTAIN}'))) window.__mark("curtain-removed");
        }
    }
// Observe "document", not "document.documentElement". This script runs at
// document start, before the parser has created <html>, so documentElement is
// still null and observing it throws — silently taking the observer out of the
// run and leaving only the frame sampler, which is throttled whenever the page
// is not being composited. "document" always exists and covers everything.
}).observe(document, { childList: true, subtree: true });
`;

const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: true,
    args: ["--no-sandbox", "--window-size=1440,900"],
    defaultViewport: { width: 1440, height: 900 },
});

const page = await browser.newPage();
await page.evaluateOnNewDocument(INSTRUMENT);

// Anything the component itself says, folded into the same timeline as the DOM
// mutations so the two can be read against each other.
page.on("console", (message) => {
    const text = message.text();
    if (!text.startsWith("[curtain]")) return;
    page.evaluate((t) => window.__mark?.("log", { text: t }), text).catch(() => {});
});

await rm(OUT, { recursive: true, force: true });
await mkdir(OUT, { recursive: true });

// Screencast frames, each one stamped by the browser itself.
const cdp = await page.createCDPSession();
const frames = [];
cdp.on("Page.screencastFrame", async ({ data, metadata, sessionId }) => {
    frames.push({ timestamp: metadata.timestamp, data });
    try {
        await cdp.send("Page.screencastFrameAck", { sessionId });
    } catch {}
});

// Waits until the curtain is gone and the scene is settled, so each step starts
// from a known state rather than from the tail of the previous one.
const settle = async (label) => {
    await page.waitForFunction(`!document.querySelector('${CURTAIN}')`, { timeout: 15000 })
        .catch(() => console.log(`  ! ${label}: curtain still present after 15s`));
    await new Promise((r) => setTimeout(r, 400));
};

// Started before the first navigation rather than just before the interesting
// one. Headless Chrome throttles requestAnimationFrame while nothing is being
// composited, so without a screencast running the frame sampler goes quiet and
// its silence looks like "nothing changed" instead of "nobody was watching".
await cdp.send("Page.startScreencast", { format: "jpeg", quality: 70, everyNthFrame: 1 });

console.log("1. cold load /fetch-courses  (castle artwork downloads, cache fills)");
await page.goto(`${ORIGIN}/fetch-courses`, { waitUntil: "networkidle0" });
await settle("cold castle");

console.log("2. client-side nav to /      (salon artwork still cold)");
await page.click('a[href="/"]');
await settle("cold salon");

// The reported case. The castle artwork is now in cache, so if the curtain is
// working as intended it should not appear at all — and if the bug is real, the
// finished castle should paint before a curtain drops over it.
console.log("3. client-side nav back to /fetch-courses  (castle artwork WARM) <- the reported case");
await page.evaluate(() => window.__mark("click"));
await page.click('a[href="/fetch-courses"]');
await new Promise((r) => setTimeout(r, 2500));
await cdp.send("Page.stopScreencast").catch(() => {});

const log = await page.evaluate(() => window.__log);
const clickAt = log.find((e) => e.event === "click")?.t ?? 0;

// The whole run, not just the click. The cold loads at the top are the control:
// if no curtain is recorded there either, the instrument is broken and the
// quiet stretch after the click proves nothing.
console.log("\n--- full timeline (ms relative to the click; negative = before) ---");
for (const entry of log) {
    const rel = entry.t - clickAt;
    const detail = entry.detail?.text
        ? entry.detail.text
        : entry.detail
          ? `curtain=${entry.detail.curtain} opacity=${entry.detail.opacity ?? "-"} layers=${entry.detail.layers}`
          : "";
    console.log(`  ${String(rel).padStart(7)}ms  ${entry.event.padEnd(16)} ${detail}`);
}

let saved = 0;
for (const [i, frame] of frames.entries()) {
    await writeFile(`${OUT}frame-${String(i).padStart(3, "0")}.jpg`, Buffer.from(frame.data, "base64"));
    saved++;
}
console.log(`\n${saved} screencast frames written to .repro/`);

// The opposite case, and the one the curtain exists for: a client-side
// navigation onto a scene this browser has never held, over a slow line. It
// needs a context of its own — clearing the HTTP cache does not evict images
// already decoded in memory, so reusing the page above would find the artwork
// warm and correctly decline to draw anything.
console.log("\n4. fresh context, throttled, client-side nav onto NEVER-loaded artwork");
const cold = await browser.createBrowserContext();
const coldPage = await cold.newPage();
await coldPage.evaluateOnNewDocument(INSTRUMENT);

const coldCdp = await coldPage.createCDPSession();
await coldCdp.send("Network.enable");
await coldCdp.send("Network.emulateNetworkConditions", {
    offline: false,
    latency: 150,
    downloadThroughput: (500 * 1024) / 8, // 500kbps — the artwork takes seconds
    uploadThroughput: (500 * 1024) / 8,
});

// Land on the salon, wait it out, then walk through the arch to a castle whose
// artwork has never been fetched in this context.
await coldPage.goto(`${ORIGIN}/`, { waitUntil: "domcontentloaded" });
await coldPage.waitForFunction(`!document.querySelector('${CURTAIN}')`, { timeout: 60000 })
    .catch(() => console.log("  ! salon curtain never left"));
await new Promise((r) => setTimeout(r, 500));

await coldPage.evaluate(() => window.__mark("click"));
await coldPage.click('a[href="/fetch-courses"]');
await new Promise((r) => setTimeout(r, 20000));

const coldLog = await coldPage.evaluate(() => window.__log);
const coldClick = coldLog.find((e) => e.event === "click")?.t ?? 0;
console.log("--- timeline (ms relative to the click) ---");
for (const entry of coldLog) {
    if (entry.event === "frame" && !entry.detail.curtain) continue;
    const rel = entry.t - coldClick;
    if (rel < -20) continue;
    const detail = entry.detail
        ? `curtain=${entry.detail.curtain} opacity=${entry.detail.opacity ?? "-"}`
        : "";
    console.log(`  ${String(rel).padStart(7)}ms  ${entry.event.padEnd(16)} ${detail}`);
}

const shown = coldLog.filter((e) => e.event === "frame" && e.t > coldClick);
const added = shown.find((e) => e.detail.curtain);
const removed = shown.find((e) => added && e.t > added.t && !e.detail.curtain);
console.log(
    added && removed
        ? `\n  VERDICT: curtain visible for ${removed.t - added.t}ms (floor 300 + fade 800)`
        : "\n  VERDICT: curtain never appeared on a cold slow navigation — WRONG"
);

await browser.close();
