# Evidencia individual — completar antes de entregar

## Alberto Herrera
- Nombre: José Alberto Herrera Flores
- Repositorio y commit evaluado: https://github.com/hertli0801/dmi-equipo06 (Commit: be254dbda18f2451e4cc9119ace443f4d36af75d)
- Mi contribución concreta: Configuración del entorno de desarrollo local en macOS, verificación reproducibilidad con `npm ci`, ejecución de la suite de pruebas sintéticas y estructuración de la documentación del proyecto (`docs/requirements.md` y `docs/decision-record.md`).
- Decisión técnica que puedo explicar: Uso estricto de `npm ci` con `package-lock.json` para garantizar una instalación determinista de dependencias sin alterar las versiones del starter entre los entornos de los integrantes del equipo.
- Comando o prueba que ejecuté y resultado: Ejecuté `npm run verify` obteniendo `Starter verificable: PASS` y la generación correcta del reporte en `reports/verification.json`.
- Limitación o riesgo que encontré: Dependencia del soporte del navegador local y de la API de Web Storage/Service Worker para simular y validar estados offline antes de la implementación formal en semanas posteriores.
- Uso de IA (herramienta, propósito, fragmentos influenciados y validación humana): 
  - Herramienta: ChatGPT / Claude.
  - Propósito: Asistencia en la estructuración de la documentación y formato Markdown.
  - Fragmentos influenciados: Formato de la sección de evidencia individual y redacción técnica de requisitos.
  - Validación humana: Revisión y adecuación manual de las salidas para coincidir exactamente con el entorno de desarrollo local (Node.js v22.18.0) y los resultados reales obtenidos.