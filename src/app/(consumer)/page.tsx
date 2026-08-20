import MultiLayerParallax from "@/components/ui/MultiLayerParallax";
import { SalonHeading } from "@/components/ui/SalonHeading";
import { type Entrance } from "@/components/ui/parallaxEntrances";
import { FREE_COURSE_TITLE } from "@/app/features/courses/lib/freeCourseNames";
import { Cinzel } from "next/font/google";

const cinzel = Cinzel({ subsets: ["latin"] });

// El Salón del Conocimiento: the page everyone arrives on. A study looking out
// through an arch, and what lies through the arch is the castle valley — so the
// arch is the way in, and the only thing here you can press.
//
// This page asks the database nothing, which is the point of putting it in front
// of everything else. It is not fully static all the same — the navbar in the
// consumer layout awaits the session, so the route is partially prerendered:
// artwork in the static shell, the bar streamed in after. What it does not do is
// wait on categories the way the castle behind it does.
// One doorway per object on the table, each sitting on the thing that names it.
// The arch itself now carries the lettering instead, which is why the way into
// the castle moved down onto the open book.
//
// Sobre Nosotros now opens onto the room it names. It used to lead back here for
// want of a page — a plaque that goes nowhere at all is one a visitor presses
// twice before deciding the site is broken — and that stand-in is what
// /sobre-nosotros replaces.
const ENTRANCES: Entrance[] = [
  // The armillary globe, far left. Set a little right of its centre so the
  // plaque clears the edge of the painting: at this scale it is half a plaque
  // wide from the left border, and the artwork's own edge is the screen's on a
  // desktop.
  { id: "anuncios", label: "Anuncios", href: "/announcements", x: 0.078, y: 0.529 },
  // The pair of closed books, on their spines.
  { id: "sobre-nosotros", label: "Sobre Nosotros", href: "/sobre-nosotros", x: 0.262, y: 0.588 },
  // The gutter of the open book, where the two pages meet.
  { id: "cursos", label: "Explorar los Cursos", href: "/fetch-courses", x: 0.502, y: 0.592 },
  // The crystal cluster. The label is imported rather than written here, so the
  // plaque and the page it opens can never come to disagree about what this
  // thing is called.
  //
  // It used to read "Lecciones semanales gratis" — the longest label on the page,
  // which is why the plaque sits left of the crystal's centre rather than on it.
  // The shorter title has room to spare, so the nudge is now only holding it off
  // the lantern behind the crystal.
  { id: "lecciones", label: FREE_COURSE_TITLE, href: "/clases-gratuitas", x: 0.845, y: 0.591 },
];

// Where the lettering hangs in the arch. Centred on the opening, which spans
// x 0.238 to 0.759.
//
// 0.32 is the highest this can sit while still clearing the navbar on the
// layouts that matter, measured with the camera at rest — which is the state the
// page opens in, and the one the clearance is owed to. Panning may still carry
// it behind the bar, and on an ultrawide-but-short window or a phone held
// sideways it does so immediately; that is the trade for lettering this size.
//
// Clearance at rest, block top against the 96px bar: 165px at 1440x900, 128px at
// 1536x864, 160px at 1920x1080, 171px on a portrait phone, 213px at 2560x1440.
const INSCRIPTION_AT = { x: 0.5, y: 0.32 };

// A shade under the castle's 0.86. Four plaques share this scene where Phase 1
// had one, and the lettering above them is what the eye should reach first.
const SALON_BUTTON_SCALE = 0.82;

export default function Home() {
  return (
    <main className={cinzel.className}>
      <MultiLayerParallax
        background="/parallax/layer_1_salon.webp"
        foreground="/parallax/layer_2_salon.webp"
        entrances={ENTRANCES}
        buttonScale={SALON_BUTTON_SCALE}
        inscription={{ node: <SalonHeading />, ...INSCRIPTION_AT }}
      />
    </main>
  );
}
