import Link from "next/link";
import { inspections } from "../../lib/data/inspections";

// Sin esto, Next.js detecta que los datos no dependen de nada dinámico y
// optimiza la ruta como estática (prerenderizada una sola vez en el build).
// Para que esta ruta sea SSR de verdad (renderizada en cada solicitud, tal
// como pide la actividad), se fuerza el modo dinámico explícitamente.
export const dynamic = "force-dynamic";

async function getInspectionsFromServer() {
    // Simula una consulta del lado del servidor (por ejemplo, a una base de
    // datos o un servicio interno). Al ser un Server Component async, Next.js
    // espera esta promesa ANTES de mandar el HTML al navegador: los datos ya
    // están en el marcado inicial, no llegan después por JavaScript.
    return inspections;
}

export default async function InspeccionesPage() {
    const items = await getInspectionsFromServer();

    return (
        <main className="page-shell">
            <header className="hero">
                <p className="eyebrow">Renderizado en servidor (SSR)</p>
                <h1>Listado de inspecciones</h1>
                <p className="lead">
                    Esta página se renderiza en el servidor en cada solicitud: el HTML que
                    recibe el navegador ya incluye los datos sintéticos, sin esperar a
                    JavaScript del lado del cliente.
                </p>
            </header>

            <section aria-labelledby="listado-heading" className="content-section">
                <h2 id="listado-heading">Inspecciones registradas</h2>
                <ul className="inspection-grid">
                    {items.map((item) => (
                        <li className="inspection-card" key={item.id}>
                            <Link href={`/inspecciones/${item.id}`}>
                                <h3>{item.location}</h3>
                                <p>{item.summary}</p>
                            </Link>
                        </li>
                    ))}
                </ul>
            </section>
        </main>
    );
}