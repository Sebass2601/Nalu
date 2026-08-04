// Shared by the server page and the client parallax component, which is why it
// lives in its own module: a "use client" file's exports reach the server as
// stubs, not as real values, so this data cannot be declared alongside the
// component that draws it.

type Hotspot = {
    id: string;
    x: number;
    y: number;
    // How the doorway is described in the admin panel. The artwork is the only
    // way to tell one doorway from another, so a bare number would leave an
    // admin guessing which part of the castle they are pointing a category at.
    label: string;
    // A doorway the homepage fills itself, which no category may take.
    reserved?: boolean;
};

// Entrances in the foreground artwork, as fractions of the image itself:
// 0,0 is its top-left corner and 1,1 its bottom-right. Because they are
// fractions, they stay glued to their doorway at any screen size.
//
// Ids are stored in the database, on each category's `doorway` column, so they
// must never be renumbered: doing so would silently move categories to other
// doorways. Adding a hotspot is safe; it simply becomes another option in the
// admin picker.
export const HOTSPOTS: Hotspot[] = [
    { id: "1", x: 0.188, y: 0.332, label: "Torres de la izquierda" },
    { id: "2", x: 0.091, y: 0.586, label: "Arco bajo la torre del reloj" },
    { id: "3", x: 0.301, y: 0.601, label: "Ventana iluminada" },
    { id: "4", x: 0.521, y: 0.630, label: "Entrada principal", reserved: true },
    { id: "5", x: 0.702, y: 0.322, label: "Torre derecha, superior" },
    { id: "6", x: 0.835, y: 0.381, label: "Torre del extremo derecho" },
    { id: "7", x: 0.721, y: 0.640, label: "Entrada de la cúpula derecha" },
    { id: "8", x: 0.867, y: 0.767, label: "Pabellón inferior derecho" },
    { id: "9", x: 0.114, y: 0.879, label: "Arco inferior izquierdo" },
];

// The doorways offered in the admin panel, in the order they are listed there.
export const ASSIGNABLE_DOORWAYS = HOTSPOTS.filter(hotspot => !hotspot.reserved);

// Valid values for a category's `doorway` column, for the form to validate
// against. A category pointing at a reserved or unknown doorway would simply
// never be drawn, so the check happens before it can be saved.
export const ASSIGNABLE_DOORWAY_IDS = ASSIGNABLE_DOORWAYS.map(({ id }) => id);

// The wording for one doorway, or undefined if the id belongs to no hotspot —
// which happens to a category whose doorway was removed from the artwork.
export function doorwayLabel(id: string | null | undefined) {
    if (id == null) return undefined;
    return HOTSPOTS.find(hotspot => hotspot.id === id)?.label;
}

// What a doorway leads to. The page decides this, since it is the side that
// knows about categories; the parallax only knows where the doorways are.
export type Entrance = {
    id: string;   // Must match a HOTSPOTS id.
    label: string;
    href: string;
};
