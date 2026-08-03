import Link from "next/link";
import { Cinzel } from "next/font/google";
import { requireAdmin } from "@/app/features/users/actions/currentUser";

const cinzel = Cinzel({ subsets: ["latin"] });

const sections = [
    {
        href: "/admin/products",
        title: "Productos",
        description: "Crea y gestiona los productos de tu catálogo.",
        icon: (
            <svg className="w-8 h-8" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24"><path stroke="currentColor" strokeLinecap="round" strokeWidth="2" d="M6 4v10m0 0a2 2 0 1 0 0 4m0-4a2 2 0 1 1 0 4m0 0v2m6-16v2m0 0a2 2 0 1 0 0 4m0-4a2 2 0 1 1 0 4m0 0v10m6-16v10m0 0a2 2 0 1 0 0 4m0-4a2 2 0 1 1 0 4m0 0v2"/></svg>
        ),
    },
    {
        href: "/admin/courses",
        title: "Cursos",
        description: "Crea el contenido de los cursos y organiza tus secciones.",
        icon: (
            <svg className="w-8 h-8" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24"><path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 19V4a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v13H7a2 2 0 0 0-2 2Zm0 0a2 2 0 0 0 2 2h12M9 3v14m7 0v4"/></svg>
        ),
    },
    {
        href: "/admin/purchases",
        title: "Ventas",
        description: "Haz seguimiento de las compras y revisa tus ingresos.",
        icon: (
            <svg className="w-8 h-8" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24"><path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 2l1.5 2h9L18 2M5 4h14l-1 16a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1L5 4Zm4 6h6m-6 4h6"/></svg>
        ),
    },
];

export default async function AdminPage() {
    await requireAdmin();

    return (
        <div className={`${cinzel.className} min-h-[calc(100vh-5rem)] bg-[#0a1628] text-yellow-200 px-6 pt-8 pb-16`}>
            <div className="max-w-5xl mx-auto">
                <h1 className="text-3xl sm:text-4xl tracking-widest text-center">Panel de Administración</h1>
                <p className="mt-3 text-center text-sm text-yellow-200/60 tracking-wide">
                    Gestiona tu tienda desde un solo lugar.
                </p>

                <div className="mt-12 grid gap-6 sm:grid-cols-3">
                    {sections.map((section) => (
                        <Link
                            key={section.href}
                            href={section.href}
                            className="group flex flex-col items-center text-center rounded-2xl border border-yellow-200/30 bg-white/5 p-8 transition hover:border-yellow-200 hover:bg-white/10"
                        >
                            <span className="text-yellow-200 transition group-hover:scale-110">
                                {section.icon}
                            </span>
                            <span className="mt-4 text-lg tracking-widest">{section.title}</span>
                            <span className="mt-2 text-xs text-yellow-200/60 tracking-wide leading-relaxed">
                                {section.description}
                            </span>
                        </Link>
                    ))}
                </div>
            </div>
        </div>
    );
}
