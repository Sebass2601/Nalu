import { connection } from "next/server";
import { getPublicPromoPrices } from "../db/products";
import { hasLiveDiscount } from "../lib/promoOffer";
import { SamhainPopup } from "./SamhainPopup";

// Decides whether there is a sale to announce.
//
// The server's half of the announcement. It reads the same promotion columns
// the product cards draw their prices from and puts them through the same
// "is it live" arithmetic, so the panel only appears while the catalogue behind
// its button really has discounted courses in it — and when the last promotion
// is removed or runs out, the panel stops appearing without anyone having to
// remember to switch it off.
//
// That yes or no is all it decides. What the panel SAYS — the size of the
// discount and the date it runs to — is fixed copy inside the panel, so nothing
// is handed to the browser and the offer codes stay here.
//
// Rendered inside a <Suspense> by the consumer layout, because of the
// `connection()` below.
export async function SamhainAnnouncement() {
    const promos = await getPublicPromoPrices();

    // Nothing is on promotion, which is the state the site is in for most of
    // the year. Returning before the line below is what keeps that state free:
    // with no clock to consult, this resolves while the page is being
    // prerendered and contributes nothing to it.
    if (promos.length === 0) return null;

    // Whether a promotion with an end date is still running is a fact about
    // the moment of the visit, so from here on this waits for the request.
    // Under Cache Components reading the clock any earlier is a build error.
    await connection();

    if (!hasLiveDiscount(promos, new Date())) return null;

    return <SamhainPopup />;
}
