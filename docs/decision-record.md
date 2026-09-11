# ADR-001 — Estrategia de aplicación

## Estado

Aceptada — 10 de septiembre de 2026.

## Contexto y restricciones

El técnico de mantenimiento realiza inspecciones dentro de los laboratorios de la UTT usando su propio dispositivo móvil, donde la señal de red es intermitente (Escenario 2 de `requirements.md`): el registro de una inspección no puede depender de tener conexión estable en todo momento. El producto usa exclusivamente **datos sintéticos**, sin información real de personas o equipos. La entrega es parte de una materia de **14 semanas**, con evaluaciones semanales, por lo que el stack elegido debe permitir avanzar de forma incremental sin rehacer la base cada vez. Además, se exige un entorno **reproducible**: cualquier integrante o el docente debe poder instalar y ejecutar el proyecto con `npm ci` / `npm run dev` sin pasos manuales adicionales. El curso ya define Next.js como base técnica.

## Alternativas consideradas

| Criterio | PWA | Web tradicional | App nativa | Multiplataforma (React Native/Flutter) |
|---|---|---|---|---|
| **Instalación** | Opcional, desde el navegador ("Agregar a inicio"), sin tienda de apps. | No se instala; siempre se abre en el navegador. | Requiere descarga desde App Store / Google Play. | Requiere descarga desde tienda, igual que la nativa. |
| **Offline / conexión intermitente** | Puede cachear el shell y datos con service worker; tolera cortes breves. | Depende 100% de la red; sin conexión no carga nada. | Puede funcionar offline si se programa explícitamente (almacenamiento local). | Offline posible pero requiere trabajo adicional por plataforma o librerías extra. |
| **Distribución** | Un solo enlace/URL; actualizaciones inmediatas al desplegar. | Igual de simple: un solo enlace. | Pasa por revisión de tienda; actualizaciones tardan días. | Revisión de tienda en cada plataforma (iOS y Android por separado). |
| **Costo de desarrollo** | Un solo código base (Next.js), ya usado en el curso. | El más simple de los cuatro, pero sin capacidades de app. | Código separado para iOS (Swift) y Android (Kotlin): duplica el esfuerzo. | Un código base, pero exige aprender un framework adicional fuera del stack del curso. |
| **Mantenimiento** | Un repositorio, un despliegue; equipo ya conoce React/Next.js. | Igual de sencillo, pero limitado en funcionalidad. | Dos bases de código que sincronizar en cada cambio. | Una base, pero con dependencias de un framework externo al curso. |
| **Capacidades del dispositivo** | Acceso limitado pero creciente vía APIs web (cámara, notificaciones, almacenamiento). | Ninguna capacidad más allá del navegador. | Acceso completo a todas las APIs del sistema operativo. | Acceso amplio, cercano al nativo, mediante puentes (bridges). |
| **Riesgos** | Soporte offline aún no implementado; push menos confiable en iOS. | No resuelve el escenario de conectividad intermitente. | Mayor costo y tiempo, incompatible con el ritmo semanal de 14 semanas. | Curva de aprendizaje de un framework nuevo, fuera del alcance del curso. |

## Decisión

Se elige **PWA con Next.js** porque es la alternativa que mejor equilibra las restricciones del contexto: reutiliza el stack que el curso ya enseña (evitando el riesgo de aprender un framework nuevo en 14 semanas), se distribuye por URL sin depender de una tienda de aplicaciones, y ofrece un camino directo hacia el soporte offline que exige el Escenario 2 de conectividad intermitente. **Lo que esta decisión no resuelve todavía:** la capacidad offline real (service worker, sincronización en segundo plano).

## Consecuencias y riesgos

**Consecuencias positivas:** un solo código base reduce el costo de mantenimiento; el equipo puede iterar semana a semana sin reescribir la aplicación; la instalación reproducible (`npm ci`) facilita que el docente y los integrantes verifiquen la misma versión.

**Costos y riesgos técnicos:**
- El soporte offline no está implementado aún: hasta que se agregue el service worker, RF-02 sigue siendo una meta, no una capacidad verificada.
- Las notificaciones push y algunas APIs del dispositivo tienen soporte más limitado o inconsistente en Safari/iOS comparado con una app nativa.
- Si en el futuro se necesitara acceso profundo a hardware (sensores, Bluetooth avanzado) o funcionamiento 100% offline desde el primer uso, una app nativa sería más adecuada pese a su mayor costo.

**Mitigación:** documentar explícitamente en `requirements.md` qué RF/RNF dependen de capacidades offline aún no implementadas, para no presentarlas como ya resueltas, y planear su implementación en las semanas correspondientes del curso.

## Validación

En las semanas donde se implemente el service worker (fuera del alcance de esta entrega), esta decisión se revisará verificando: (1) que el shell de la aplicación cargue sin conexión a internet, y (2) que una inspección capturada sin red se sincronice correctamente al recuperar la conexión, cumpliendo el RF-02 definido en `requirements.md`. Si alguna de estas pruebas falla de forma persistente, se reevaluará si la PWA sigue siendo la estrategia adecuada.
