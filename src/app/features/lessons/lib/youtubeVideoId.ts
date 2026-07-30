// Pulls the video id out of whatever someone pasted into the lesson form.
//
// The column is called `youtubeVideoId` and the player needs exactly that: the
// eleven-character id, on its own. But the thing YouTube's own "Share" button
// hands you is a full URL, so that is what gets pasted — and storing it verbatim
// produced a player that silently loaded nothing, because the value is passed
// straight through to YouTube as an id.
//
// Rather than telling people off for pasting the obvious thing, this accepts
// every form the link can take and reduces it to the id. Anything it cannot
// recognise comes back null, which is what lets the form reject it up front
// instead of saving a lesson whose video will never play.
export function extractYouTubeVideoId(input: string): string | null {
    const trimmed = input.trim();
    if (trimmed === "") return null;

    // Already an id. Checked first so re-saving a lesson that was entered
    // correctly cannot mangle it, and so the common case costs no URL parsing.
    if (isVideoId(trimmed)) return trimmed;

    // People paste links without the scheme too ("www.youtube.com/watch?..."),
    // which `URL` refuses to parse. Adding one back is harmless: a string that
    // was not a URL to begin with still fails the host check below.
    const withScheme = /^https?:\/\//i.test(trimmed)
        ? trimmed
        : `https://${trimmed}`;

    let url: URL;
    try {
        url = new URL(withScheme);
    } catch {
        return null;
    }

    const host = url.hostname.replace(/^(www|m)\./i, "").toLowerCase();

    // youtu.be/<id> — the id is the whole path.
    if (host === "youtu.be") {
        return firstPathSegmentIfVideoId(url);
    }

    if (host !== "youtube.com" && host !== "youtube-nocookie.com") {
        return null;
    }

    // The ordinary watch link. `v` also survives every extra parameter YouTube
    // attaches — playlists, radio, timestamps — because this reads the one
    // parameter it wants rather than trying to strip the others.
    const fromQuery = url.searchParams.get("v");
    if (fromQuery != null && isVideoId(fromQuery)) return fromQuery;

    // /embed/<id> and /shorts/<id> put it in the path instead.
    const [prefix, candidate] = url.pathname.split("/").filter(Boolean);
    if (
        (prefix === "embed" || prefix === "shorts" || prefix === "live") &&
        candidate != null &&
        isVideoId(candidate)
    ) {
        return candidate;
    }

    return null;
}

// YouTube ids are eleven characters of URL-safe base64. Checking the shape is
// what separates "an id" from "some other word in the path", and it is as far
// as this can go without asking YouTube whether the video exists.
function isVideoId(value: string) {
    return /^[\w-]{11}$/.test(value);
}

function firstPathSegmentIfVideoId(url: URL) {
    const [candidate] = url.pathname.split("/").filter(Boolean);
    return candidate != null && isVideoId(candidate) ? candidate : null;
}
