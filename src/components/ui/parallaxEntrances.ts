// Shared by the server page and the client parallax component, which is why it
// lives in its own module: a "use client" file's exports reach the server as
// stubs, not as real values, so this data cannot be declared alongside the
// component that draws it.

// Entrances in the foreground artwork, as fractions of the image itself:
// 0,0 is its top-left corner and 1,1 its bottom-right. Because they are
// fractions, they stay glued to their doorway at any screen size.
export const HOTSPOTS = [
    { id: "1", x: 0.188, y: 0.332 }, // Left tower cluster.
    { id: "2", x: 0.091, y: 0.586 }, // Left castle archway, under the clock tower.
    { id: "3", x: 0.301, y: 0.601 }, // Mid-left lit window.
    { id: "4", x: 0.521, y: 0.630 }, // Main entrance.
    { id: "5", x: 0.702, y: 0.322 }, // Right tower, upper.
    { id: "6", x: 0.835, y: 0.381 }, // Far right tower.
    { id: "7", x: 0.721, y: 0.640 }, // Right dome entrance.
    { id: "8", x: 0.867, y: 0.767 }, // Lower right pavilion.
    { id: "9", x: 0.114, y: 0.879 }, // Lower left archway.
];

// What a doorway leads to. The page decides this, since it is the side that
// knows about categories; the parallax only knows where the doorways are.
export type Entrance = {
    id: string;   // Must match a HOTSPOTS id.
    label: string;
    href: string;
};
