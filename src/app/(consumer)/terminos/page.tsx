import type { ReactNode } from "react";
import { cinzel } from "@/components/ui/fonts";
import { BackLink } from "@/components/ui/BackToHomeLink";
import { CarvedBackdrop } from "@/components/ui/CarvedBackdrop";
import { pageMetadata } from "@/lib/pageMetadata";

// Términos y Condiciones: the rules of using the site, buying a course, and
// what the courses are and are not. Reached from the faint link at the foot of
// every page (LegalFooter).
//
// Every factual claim here is meant to match what the code actually does, and
// should be checked against it when either changes:
//   - accounts by email and password (stored hashed) or by Google — auth.ts
//   - payments taken by Hotmart, never by this site — the checkout action
//   - access withdrawn on refund or chargeback — the Hotmart webhook
//   - regional prices and dated promotions — userCountryHeader, promoOffer
//   - Google Analytics in production, behind a consent notice for visitors
//     from Europe — components/analytics, lib/analytics
//
// Set like Sobre Nosotros: Cinzel for the headings, Geist (`font-sans`) for
// everything read at length, on a reading measure of `max-w-3xl`.

const LAST_UPDATED = "8 de noviembre de 2026";
const CONTACT_EMAIL = "info@naluescuela.com";
const WHATSAPP_URL = "https://wa.me/50769742717";
const WHATSAPP_LABEL = "+507 6974-2717";

export const metadata = pageMetadata({
    path: "/terminos",
    title: "Términos y Condiciones",
    description:
        "Términos y condiciones de uso de Nalu Escuela: cuentas, cursos, pagos con Hotmart, reembolsos, propiedad del contenido, privacidad y cookies.",
});

export default function TermsPage() {
    return (
        // No background of its own, so CarvedBackdrop (at `-z-10`) shows
        // through — see the note on the same element in Sobre Nosotros.
        <main className={`${cinzel.className} relative min-h-screen w-full`}>
            <CarvedBackdrop />

            <div className="mx-auto w-full max-w-3xl px-4 pt-32 pb-24">
                <BackLink href="/" className="mb-8">
                    Volver al salón
                </BackLink>

                <header className="mb-10 flex flex-col gap-3">
                    <h1 className="text-4xl leading-tight tracking-wide text-gold sm:text-5xl">
                        Términos y Condiciones
                    </h1>
                    <p className="font-sans text-sm text-ink-meta">
                        Última actualización: {LAST_UPDATED}
                    </p>
                </header>

                <div className="flex flex-col gap-10 rounded-2xl border border-gold/30 bg-[#0a1628]/70 p-6 font-sans text-base leading-relaxed text-ink-body backdrop-blur-md sm:p-10">
                    <Section title="1. Quiénes somos">
                        <p>
                            Nalu Escuela («Nalu», «nosotros») es una escuela
                            online de cursos holísticos disponible en
                            naluescuela.com. Puedes escribirnos a{" "}
                            <Email /> o por WhatsApp al <WhatsApp />.
                        </p>
                    </Section>

                    <Section title="2. Aceptación de estos términos">
                        <p>
                            Al navegar por el sitio, crear una cuenta o comprar
                            un curso, aceptas estos términos. Si no estás de
                            acuerdo con ellos, te pedimos que no uses el sitio.
                        </p>
                    </Section>

                    <Section title="3. Tu cuenta">
                        <p>
                            Puedes registrarte con tu correo y una contraseña,
                            o con tu cuenta de Google. Al hacerlo te
                            comprometes a:
                        </p>
                        <List>
                            <li>Dar datos verdaderos.</li>
                            <li>
                                Mantener tu contraseña en secreto. Eres
                                responsable de lo que se haga con tu cuenta.
                            </li>
                            <li>
                                No compartir tu cuenta. Es personal e
                                intransferible.
                            </li>
                        </List>
                        <p>
                            Debes ser mayor de edad para registrarte, o contar
                            con la autorización de tu madre, padre o tutor.
                        </p>
                    </Section>

                    <Section title="4. Cursos y clases gratuitas">
                        <p>
                            Las clases gratuitas están disponibles para
                            cualquier persona con una cuenta, sin costo. Podemos
                            añadir, cambiar o retirar clases gratuitas en
                            cualquier momento.
                        </p>
                        <p>
                            Al comprar un curso obtienes acceso personal a su
                            contenido dentro de la plataforma, mientras el
                            curso siga publicado en Nalu Escuela. Algunos
                            cursos se publican por entregas: su contenido se va
                            añadiendo con el tiempo, como se indica en la página
                            de cada curso.
                        </p>
                    </Section>

                    <Section title="5. Precios y pagos">
                        <p>
                            Los precios se muestran en dólares
                            estadounidenses. Pueden variar según tu país y
                            durante promociones con fecha de inicio y fin. El
                            precio que pagas es el que aparece en la página de
                            pago.
                        </p>
                        <p>
                            Los pagos los procesa Hotmart, una plataforma de
                            pagos externa. Nalu Escuela no recibe ni guarda los
                            datos de tu tarjeta. Al pagar también aceptas las
                            condiciones de Hotmart.
                        </p>
                    </Section>

                    <Section title="6. Reembolsos">
                        <p>
                            Puedes pedir el reembolso de una compra dentro del
                            plazo de garantía que aparece en la página de pago
                            de Hotmart. Puedes solicitarlo directamente en
                            Hotmart o escribiéndonos a <Email />.
                        </p>
                        <p>
                            Cuando se reembolsa una compra, o cuando se anula
                            el cobro a través del banco, se retira el acceso al
                            curso correspondiente.
                        </p>
                    </Section>

                    <Section title="7. Propiedad del contenido">
                        <p>
                            Los videos, textos, imágenes, ilustraciones y la
                            marca Nalu Escuela pertenecen a Nalu Escuela o a sus
                            autores. Tu compra te da derecho a usarlos para tu
                            aprendizaje personal. No está permitido:
                        </p>
                        <List>
                            <li>
                                Grabar o copiar el contenido de los cursos. El
                                material que la propia plataforma ofrece para
                                descargar es solo para tu uso personal.
                            </li>
                            <li>
                                Compartirlo, publicarlo, revenderlo o enseñarlo
                                como propio.
                            </li>
                            <li>Dar acceso a tu cuenta a otras personas.</li>
                        </List>
                    </Section>

                    <Section title="8. Naturaleza de los cursos">
                        <p>
                            Los cursos de Nalu Escuela tratan saberes
                            holísticos y espirituales —numerología, tarot,
                            sigilos, energías y otros— con fines educativos y de
                            crecimiento personal.
                        </p>
                        <p>
                            Su contenido no sustituye el consejo de un
                            profesional médico, psicológico, legal ni
                            financiero. No garantizamos resultados concretos, y
                            las decisiones que tomes a partir de lo aprendido
                            son tu responsabilidad.
                        </p>
                    </Section>

                    <Section title="9. Uso aceptable">
                        <p>
                            No está permitido usar el sitio para fines ilegales,
                            intentar acceder a partes del sitio o a cuentas que
                            no te corresponden, extraer su contenido de forma
                            automatizada ni interferir con su funcionamiento.
                        </p>
                        <p>
                            Podemos suspender o cerrar las cuentas que
                            incumplan estos términos.
                        </p>
                    </Section>

                    <Section id="cookies" title="10. Datos personales y cookies">
                        <p>Para que la plataforma funcione guardamos:</p>
                        <List>
                            <li>
                                Tu nombre y tu correo, y tu contraseña cifrada
                                si te registras con correo.
                            </li>
                            <li>
                                Tu foto de perfil, si entras con Google.
                            </li>
                            <li>
                                Tus compras y tu progreso en las lecciones.
                            </li>
                        </List>
                        <p>
                            Usamos dos tipos de cookies, pequeños archivos que
                            el sitio guarda en tu navegador:
                        </p>
                        <List>
                            <li>
                                <strong className="text-ink-bright">
                                    Necesarias:
                                </strong>{" "}
                                mantienen tu sesión iniciada y protegen los
                                formularios. Sin ellas el sitio no funciona, así
                                que no requieren permiso.
                            </li>
                            <li>
                                <strong className="text-ink-bright">
                                    De medición:
                                </strong>{" "}
                                las de Google Analytics, que nos dicen cuántas
                                personas visitan el sitio y qué páginas ven.
                            </li>
                        </List>
                        <p>
                            Si nos visitas desde el Espacio Económico Europeo,
                            el Reino Unido o Suiza, solo activamos Google
                            Analytics si lo aceptas en el aviso de cookies.
                            Puedes cambiar tu elección cuando quieras desde el
                            enlace «Cookies» al pie de cada página.
                        </p>
                        <p>
                            No vendemos tus datos. Puedes pedirnos que borremos
                            tu cuenta escribiendo a <Email />.
                        </p>
                    </Section>

                    <Section title="11. Responsabilidad">
                        <p>
                            Hacemos lo posible para que el sitio funcione sin
                            interrupciones, pero no podemos garantizarlo. Puede
                            haber pausas por mantenimiento o por fallos
                            técnicos.
                        </p>
                        <p>
                            En la medida en que la ley lo permita, nuestra
                            responsabilidad ante ti se limita al importe que
                            hayas pagado por el curso en cuestión.
                        </p>
                    </Section>

                    <Section title="12. Cambios en estos términos">
                        <p>
                            Podemos actualizar estos términos. La fecha de
                            arriba indica la última versión. Si el cambio es
                            importante, lo avisaremos en el sitio. Seguir
                            usando Nalu Escuela después de un cambio significa
                            que lo aceptas.
                        </p>
                    </Section>

                    <Section title="13. Ley aplicable">
                        <p>
                            Estos términos se rigen por las leyes de la
                            República de Panamá.
                        </p>
                    </Section>

                    <Section title="14. Contacto">
                        <p>
                            Para cualquier duda sobre estos términos,
                            escríbenos a <Email /> o por WhatsApp al{" "}
                            <WhatsApp />.
                        </p>
                    </Section>
                </div>
            </div>
        </main>
    );
}

// A numbered clause: the heading in Cinzel, like every heading on the site,
// over body copy that stays in the Geist set on the panel around it.
//
// `id` makes a clause linkable — the cookie notice points at #cookies — and
// `scroll-mt-32` stops the fixed 96px navbar covering its heading on arrival.
function Section({
    id,
    title,
    children,
}: {
    id?: string;
    title: string;
    children: ReactNode;
}) {
    return (
        <section id={id} className="flex scroll-mt-32 flex-col gap-3">
            <h2
                className={`${cinzel.className} text-xl tracking-wide text-ink-bright sm:text-2xl`}
            >
                {title}
            </h2>
            {children}
        </section>
    );
}

function List({ children }: { children: ReactNode }) {
    return (
        <ul className="flex list-disc flex-col gap-1.5 pl-6 marker:text-gold">
            {children}
        </ul>
    );
}

// Gold, the colour globals.css keeps for what can be pressed.
const LINK_CLASS = "text-gold underline underline-offset-2 hover:text-ink-bright";

function Email() {
    return (
        <a href={`mailto:${CONTACT_EMAIL}`} className={LINK_CLASS}>
            {CONTACT_EMAIL}
        </a>
    );
}

function WhatsApp() {
    return (
        <a
            href={WHATSAPP_URL}
            target="_blank"
            rel="noopener noreferrer"
            className={LINK_CLASS}
        >
            {WHATSAPP_LABEL}
        </a>
    );
}
