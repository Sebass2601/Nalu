import { pageMetadata } from "@/lib/pageMetadata";
import { cinzel } from "@/components/ui/fonts";
import { BackLink } from "@/components/ui/BackToHomeLink";
import { PlaqueButton } from "@/components/ui/PlaqueButton";
import { bevelFace, bevelOutline } from "@/components/ui/plaque";
import { CarvedBackdrop } from "@/components/ui/CarvedBackdrop";
import { AboutVideo } from "./AboutVideo";

// Behind the pair of closed books on the salon table.
//
// The room the "Sobre Nosotros" plaque was pointing back at itself for want of
// anything to open onto. It is the only page on the site that is pure reading,
// which is what every decision below is answering: there is no artwork to look
// at and nothing to press until the very end, so the page has to hold attention
// on rhythm alone.
//
// Three devices do that work, and they are all the site's own:
//
//   The lead lines. The copy arrives already broken into single sentences that
//   stand apart from the paragraphs under them. Those are set larger and in
//   gold — a beat before each block rather than a heading, which is what they
//   are.
//
//   The zigzag. The seven portals alternate sides of a vertical spine, so the
//   eye is handed from one to the next instead of walking a column of equal
//   blocks. Below `lg` there is no room for two sides and they stack.
//
//   The plaque. The panels are cut from `bevelFace`, the same octagon as the
//   doorways and the navbar, so a portal reads as a plaque on a wall rather than
//   a card from another design.
//
// Two departures from the site's own rules, both asked for and both deliberate:
//
//   Gold headings. globals.css reserves gold for what you PRESS and ink for what
//   you READ, and says in as many words that a gold heading is almost certainly
//   a mistake. It is spent here on every title and lead line. This page has one
//   pressable thing on it — the plaque at the very bottom — so there is nothing
//   for gold to be confused with, which is the condition the rule was protecting
//   and the reason it can be broken on this page and nowhere else.
//
//   Two typefaces. Cinzel is an inscriptional face with no lowercase: it draws
//   small capitals where lowercase should be, which is why it carries a heading
//   beautifully and turns a paragraph into a wall of capitals. So the headings
//   and lead lines stay Cinzel and everything read at length — the paragraphs,
//   the epigraphs — is set in `font-sans`, the Geist the rest of the app already
//   uses. That is also the split the eye needs: the two roles now differ by case
//   and shape, not only by size.

export const metadata = pageMetadata({
    path: "/sobre-nosotros",
    title: "Sobre Nosotros",
    description:
        "El Reino de Nalu: un castillo del conocimiento donde cada portal es un área de estudio — numerología, tarot, sigilos, magia draconiana, realidad cuántica y más.",
});

// The seven portals, in the order the copy gives them.
//
// Data rather than seven hand-written blocks: the layout alternates on index,
// and an eighth portal — the copy promises there will be one — should be a new
// entry here, not a new copy of the markup with the sides swapped by hand.
const PORTALS = [
    {
        numeral: "I",
        name: "La Biblioteca de los Números",
        epigraph:
            "Las antiguas bibliotecas enseñan que todo posee un orden y un lenguaje oculto.",
        body: [
            "En este portal descubrirás el arte de la numerología, el universo simbólico de los números y su relación con la personalidad, los ciclos de la vida, las relaciones humanas y otros sistemas tradicionales de interpretación.",
            "Es un espacio dedicado a comprender cómo distintas corrientes han utilizado el lenguaje numérico como herramienta de reflexión y autoconocimiento.",
        ],
    },
    {
        numeral: "II",
        name: "El Templo de los Espejos",
        epigraph: "Todo espejo invita a mirar más allá de la apariencia.",
        body: [
            "Este portal está dedicado al autoconocimiento, la integración de las luces y las sombras, la escritura simbólica y el estudio de prácticas mágicas que utilizan el espejo como un poderoso símbolo de transformación interior.",
        ],
    },
    {
        numeral: "III",
        name: "El Observatorio de los Oráculos",
        epigraph: "Desde lo alto del Reino se observa el lenguaje de los símbolos.",
        body: [
            "Aquí explorarás diferentes tradiciones oraculares, aprendiendo el significado de sus imágenes, sus métodos de interpretación y el desarrollo de la intuición a través del estudio de diversos sistemas simbólicos, como el tarot o las runas del Futhark Antiguo.",
        ],
    },
    {
        numeral: "IV",
        name: "La Torre del Tiempo",
        epigraph: "Cada instante abre nuevas posibilidades.",
        body: [
            "Este portal está dedicado al estudio del tiempo, los ciclos de transformación, la manifestación consciente y las distintas corrientes que reflexionan sobre la creación de nuevas posibilidades y el desarrollo del potencial personal.",
            "Podrás estudiar la realidad cuántica y la magia del tiempo, los portales y las líneas temporales.",
        ],
    },
    {
        numeral: "V",
        name: "El Salón de las Inteligencias Mágicas",
        epigraph: "Este es el laboratorio creativo del Reino.",
        body: [
            "Aquí descubrirás el fascinante mundo de los sigilos, los servidores mágicos, los arquetipos, la programación simbólica y otras herramientas utilizadas en algunas tradiciones contemporáneas para representar y enfocar la intención mediante símbolos y estructuras creativas.",
            "Recorrerás la galería de los objetos mágicos y aprenderás a usarlos en las prácticas mágicas.",
        ],
    },
    {
        numeral: "VI",
        name: "El Santuario Dracónico",
        epigraph:
            "Custodiado por la figura ancestral del dragón, este santuario invita a explorar uno de los grandes arquetipos presentes en numerosas culturas.",
        body: [
            "En este portal conocerás la simbología del dragón, su presencia en la mitología y las tradiciones espirituales, así como las enseñanzas inspiradas en la magia draconiana y el camino del guerrero interior.",
        ],
    },
    {
        numeral: "VII",
        name: "El Reino Escondido",
        epigraph:
            "Más allá de los muros del castillo se extiende un antiguo bosque donde la naturaleza se convierte en maestra.",
        body: [
            "Este portal reúne enseñanzas inspiradas en los elementales, la magia natural, la Luna, los cristales, las plantas, los animales de poder, los familiares mágicos y otros seres presentes en las tradiciones mágicas que celebran la conexión entre el ser humano y el mundo natural.",
        ],
    },
];

export default function AboutPage() {
    return (
        // No background on <main>, which is the opposite of every other page
        // here and is what makes the backdrop visible at all.
        //
        // CarvedBackdrop paints at `-z-10`. A negative-z-index descendant is
        // painted early — after the root background but BEFORE the in-flow block
        // backgrounds of the page — so an opaque colour on this element lands on
        // top of it and hides it completely. The canvas navy still comes from
        // <body> in the root layout, which is what shows through an overscroll
        // bounce where a fixed layer cannot reach.
        <main
            className={`${cinzel.className} relative flex min-h-screen w-full flex-col`}
        >
            <CarvedBackdrop />

            {/* The same `pt-32` every consumer page opens with, which is what
                clears the fixed 96px bar. Back to the salon, not the castle:
                the closed books this page hangs off are on the salon table. */}
            <div className="mx-auto w-full max-w-5xl px-4 pt-32">
                <BackLink href="/">Volver al salón</BackLink>
            </div>

            <Opening />

            {/* The portals explained aloud, standing between the line that
                hands over to them and the seven panels themselves. Its own
                section rather than a tail on `Opening`, which is prose set to a
                reading measure and has no business holding a picture. */}
            <section className="mx-auto w-full max-w-2xl px-4 pt-4 pb-8">
                <AboutVideo
                    src="/sobre_nosotros_video_2.mp4"
                    width={576}
                    height={576}
                    label="Explicación de cada uno de los portales, las categorías de cursos."
                />
            </section>

            <Portals />
            <Closing />
        </main>
    );
}

// The welcome, set narrow and centred.
//
// `max-w-2xl` against the portals' `max-w-5xl` on purpose: this is the one part
// of the page read straight through, and a measure of about 70 characters is
// what keeps a line from being hard to track back from. The portals are scanned
// rather than read, and can afford to be wider.
function Opening() {
    return (
        <section className="mx-auto w-full max-w-2xl px-4 pt-16 pb-8 text-center sm:pt-20">
            <h1 className="text-4xl leading-tight tracking-wide text-gold sm:text-5xl">
                Bienvenido al Reino de Nalu
            </h1>

            <Rule className="my-10" />

            {/* The identity piece, sitting between the welcome and the verses
                that unpack it. Portrait, and narrower than the column it is in:
                the source is 576px wide and enlarging it past that only makes
                the softness legible. */}
            <AboutVideo
                src="/sobre_nosotros_video_1.mp4"
                width={576}
                height={1024}
                label="Descripción de la identidad de Nalu."
                className="mb-12"
            />

            <div className="flex flex-col gap-12">
                <Verse lead="Dicen que existen lugares que no aparecen en los mapas.">
                    <p>
                        Lugares donde el conocimiento se conserva entre antiguos
                        libros, donde cada salón guarda una enseñanza distinta y
                        donde las puertas no conducen simplemente a
                        habitaciones, sino a nuevos mundos por descubrir.
                    </p>
                </Verse>

                <Verse lead="Nalu Escuela Holística nació inspirada en esa idea.">
                    <p>
                        Imaginamos la escuela como un gran castillo del
                        conocimiento, donde cada portal representa un área
                        diferente de estudio y cada estudiante avanza a su
                        propio ritmo, explorando los caminos que más despierten
                        su curiosidad.
                    </p>
                </Verse>

                <Verse lead="En Nalu no encontrarás pasillos vacíos.">
                    <p>
                        Encontrarás bibliotecas donde los números cuentan
                        historias, templos dedicados al autoconocimiento,
                        observatorios donde se estudian antiguos sistemas
                        simbólicos, santuarios inspirados en los grandes mitos y
                        jardines donde la naturaleza comparte sus enseñanzas.
                    </p>
                    <p>
                        Cada portal reúne cursos, talleres, conferencias,
                        prácticas y recursos dedicados a un tema específico,
                        permitiéndote profundizar paso a paso en ese universo de
                        conocimiento.
                    </p>
                </Verse>

                <Verse lead="Creemos que aprender también puede ser una experiencia inmersiva.">
                    <p>
                        Por eso, más que ingresar a una plataforma educativa,
                        queremos que sientas que atraviesas las puertas de un
                        reino vivo, donde cada visita es una nueva aventura y
                        cada conocimiento descubierto se convierte en una llave
                        que abre el siguiente portal.
                    </p>
                </Verse>

                <Verse lead="Este castillo seguirá creciendo.">
                    <p>
                        Nuevos salones se abrirán, nuevas bibliotecas aparecerán
                        y nuevos caminos serán incorporados para que siempre
                        exista una puerta más esperando ser descubierta.
                    </p>
                </Verse>
            </div>

            <Rule className="my-12" />

            {/* The line the whole opening has been walking towards, so it is
                the largest thing on the page after the title — and the handover
                to the seven portals below. */}
            <p className="text-xl leading-relaxed text-gold sm:text-2xl">
                Las puertas del conocimiento ya están abiertas. Solo falta
                decidir cuál será el primer portal que explorarás.
            </p>
        </section>
    );
}

// The seven, alternating either side of a spine.
function Portals() {
    return (
        <section className="mx-auto w-full max-w-5xl px-4 pt-8 pb-4">
            <h2 className="text-center text-sm font-semibold tracking-[0.3em] text-gold uppercase sm:text-base">
                Los portales del Reino
            </h2>

            {/* The spine. Absolute and `lg:block`, so it exists only on the
                layout that has two sides to divide — and `aria-hidden`, being a
                drawn line with nothing to say. It stops short at both ends
                (`inset-y-8`) rather than running the full height, which is what
                keeps it from looking like a table border. */}
            <div className="relative mt-14">
                <span
                    aria-hidden
                    className="absolute inset-y-8 left-1/2 hidden w-px -translate-x-1/2 bg-linear-to-b from-transparent via-gold/45 to-transparent lg:block"
                />

                <ol className="flex flex-col gap-12 lg:gap-16">
                    {PORTALS.map((portal, index) => (
                        <Portal
                            key={portal.name}
                            portal={portal}
                            // The odd ones hang right. Index parity is the only
                            // thing that decides a side, which is what makes
                            // adding a portal a one-entry change.
                            side={index % 2 === 0 ? "left" : "right"}
                        />
                    ))}
                </ol>
            </div>
        </section>
    );
}

function Portal({
    portal,
    side,
}: {
    portal: (typeof PORTALS)[number];
    side: "left" | "right";
}) {
    const isLeft = side === "left";

    return (
        <li className="relative lg:grid lg:grid-cols-2 lg:items-center lg:gap-16">
            {/* The node pinning this portal to the spine: the site's diamond,
                the same one that pins every plaque. Drawn here rather than
                borrowed from `plaque.tsx` because that component centres itself
                horizontally on its parent — the job it has on a plaque — and
                this one has to sit on the spine instead. */}
            <span
                aria-hidden
                className="absolute top-1/2 left-1/2 hidden size-3 -translate-x-1/2 -translate-y-1/2 rotate-45 bg-gold ring-4 ring-[#0a1628] lg:block"
            />

            {/* `col-start-2` is what puts a panel on the right; without it the
                grid fills left to right and every panel lands in column one.
                The empty half of the row is simply not drawn — a grid cell that
                holds nothing does not need to exist. */}
            <Panel className={isLeft ? "lg:col-start-1" : "lg:col-start-2"}>
                <div className="flex items-baseline gap-4">
                    <span
                        aria-hidden
                        className="text-lg font-semibold tracking-[0.2em] text-gold/70"
                    >
                        {portal.numeral}
                    </span>
                    <h3 className="text-2xl leading-snug tracking-wide text-gold">
                        {portal.name}
                    </h3>
                </div>

                {/* The epigraph: the single line the copy gives each portal
                    before its description. Kept apart from the body by a short
                    gold rule rather than by italics — Cinzel has no true italic,
                    so a browser would slant it by hand, and a faked oblique on a
                    display serif looks like a rendering fault. */}
                <p className="mt-4 flex flex-col gap-4 font-sans text-base leading-relaxed tracking-normal text-ink">
                    <span aria-hidden className="h-px w-12 bg-gold/40" />
                    {portal.epigraph}
                </p>

                <div className="mt-4 flex flex-col gap-3 font-sans text-[0.9375rem] leading-relaxed tracking-normal text-ink-body">
                    {portal.body.map(paragraph => (
                        <p key={paragraph}>{paragraph}</p>
                    ))}
                </div>
            </Panel>
        </li>
    );
}

// A portal's panel: the plaque geometry at reading size.
//
// Two layers, exactly as PlaqueButton builds its own — a clipped face, and the
// octagon traced as a hollow rule on top of it. The face has to be clipped
// rather than rounded because `border-radius` cannot cut a 45-degree corner, and
// the rule has to be a clipped polygon rather than a CSS border because a border
// follows the element's box, which the clip has already cut away.
//
// `cut: 16` against the buttons' 10: the corner slice has to keep its
// proportion to the panel, and a 10px notch on a block this size reads as a
// manufacturing defect rather than a bevel.
function Panel({
    className = "",
    children,
}: {
    className?: string;
    children: React.ReactNode;
}) {
    return (
        <div className={`relative ${className}`}>
            <div
                // Opaque enough to sit on the ring-chain without it showing
                // through the text, and blurred so the lattice behind the edges
                // reads as depth rather than as a pattern interrupted. This is
                // the panel's whole job now that the wall has something on it.
                className="bg-[#0a1628]/80 px-6 py-7 backdrop-blur-md sm:px-8 sm:py-8"
                style={{ clipPath: bevelFace(16) }}
            >
                {children}
            </div>
            <span
                aria-hidden
                className="pointer-events-none absolute inset-0 bg-gold/25"
                style={{ clipPath: bevelOutline({ cut: 16, inset: 0, width: 1 }) }}
            />
        </div>
    );
}

// The question, and the one thing on the page you can press.
function Closing() {
    return (
        <section className="mx-auto flex w-full max-w-2xl flex-col items-center gap-6 px-4 pt-20 pb-28 text-center">
            <Rule className="mb-4 w-full" />

            <p className="font-sans text-lg tracking-normal text-ink-body sm:text-xl">
                Ahora solo queda una decisión…
            </p>
            <p className="text-3xl leading-tight tracking-wide text-gold sm:text-4xl">
                ¿Qué puerta deseas abrir primero?
            </p>

            {/* Straight to the catalogue, the same place the salon's way in
                now opens, so a visitor who read to the end is one tap from a
                course rather than another hall to walk through. Primary,
                because it is the only call to action on the page and there is
                nothing for it to compete with. */}
            <PlaqueButton href="/products" className="mt-4">
                Explorar los Cursos
            </PlaqueButton>
        </section>
    );
}

// A lead line and the paragraphs it introduces.
//
// The lead is a <p> and not an <h3>: it reads as a heading but it is a
// sentence, and marking sentences up as headings is what makes a screen
// reader's outline of the page unusable.
function Verse({
    lead,
    children,
}: {
    lead: string;
    children: React.ReactNode;
}) {
    return (
        <div className="flex flex-col gap-4">
            <p className="text-xl leading-snug tracking-wide text-gold sm:text-2xl">
                {lead}
            </p>
            <div className="flex flex-col gap-4 font-sans text-base leading-relaxed tracking-normal text-ink-body sm:text-[1.0625rem]">
                {children}
            </div>
        </div>
    );
}

// The rule-and-diamond the salon lettering uses, at page width. The one piece of
// gold in a wall of text, and the site's own way of marking a division.
function Rule({ className = "" }: { className?: string }) {
    return (
        <div
            aria-hidden
            className={`mx-auto flex w-full max-w-sm items-center gap-3 ${className}`}
        >
            <span className="h-px flex-1 bg-linear-to-r from-transparent to-gold/40" />
            <span className="size-2 rotate-45 bg-gold/80" />
            <span className="h-px flex-1 bg-linear-to-l from-transparent to-gold/40" />
        </div>
    );
}
