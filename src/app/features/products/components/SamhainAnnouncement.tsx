import { connection } from "next/server";
import { formatDayAndMonth } from "@/lib/formatters";
import { getPublicPromoPrices } from "../db/products";
import { summarizeLivePromos } from "../lib/promoOffer";
import { SamhainPopup } from "./SamhainPopup";

// Decides whether there is a sale to announce, and what to say about it.
//
// The server's half of the announcement. It reads the same promotion columns
// the product cards draw their prices from and puts them through the same
// "is it live" arithmetic, so the panel cannot promise a discount the catalogue
// behind its button does not show — and when the last promotion is removed or
// runs out, the panel stops appearing without anyone having to remember to
// switch it off.
//
// What it hands the browser is two numbers and a date already written out.
// The offer codes stay here.
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

    const summary = summarizeLivePromos(promos, new Date());

    if (summary == null) return null;

    return (
        <SamhainPopup
            minPercentOff={summary.minPercentOff}
            maxPercentOff={summary.maxPercentOff}
            endsOn={
                summary.endsAt == null
                    ? null
                    : formatDayAndMonth(summary.endsAt)
            }
        />
    );
}
