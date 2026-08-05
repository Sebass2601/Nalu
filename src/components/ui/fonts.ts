import { Inter } from 'next/font/google';
import { Cinzel } from 'next/font/google';

export const inter = Inter({ subsets: ['latin' ]});

// No `weight`, which is what loads Cinzel as the VARIABLE font it is — one
// file covering the whole 400-900 range — rather than a single static 400 cut.
//
// This is load-bearing now that the page sets a heavier base weight. Given only
// a 400 file, a browser asked for 500 does not decline: it fakes it, smearing
// each glyph outward a fraction of a pixel. On a serif display face that reads
// as blurred rather than bold, and it is the kind of thing that looks merely
// "slightly off" without any obvious cause.
//
// The other Cinzel() calls scattered through the app already omit `weight` and
// so were always getting the variable file. This one was the odd one out.
export const cinzel = Cinzel({
    subsets: ['latin'],
});