# Requisitos del producto — completar en Semana 1

> Conserva estos encabezados y reemplaza las instrucciones por tu análisis. No uses datos reales.

## 1. Problema y contexto

Describe qué problema de inspecciones de mantenimiento se quiere resolver, en qué contexto de conectividad y qué queda fuera del alcance.

## 2. Usuarios y escenarios

Identifica los usuarios principales y escribe al menos dos escenarios observables, incluyendo uno con conectividad intermitente.

## 3. Requisitos funcionales

Escribe requisitos numerados con formato verificable (por ejemplo, RF-01). Cada requisito debe incluir una condición de aceptación.

## 4. Requisitos no funcionales

* **Reproducibilidad:** El proyecto debe instalarse sin errores usando `npm ci`. Se comprobará ejecutando el comando antes de cada entrega semanal.
* **Accesibilidad:** La interfaz debe ser navegable mediante teclado y cumplir con contraste básico. Se comprobará usando herramientas de DevTools.
* **Seguridad y Privacidad:** El código no debe exponer secretos, contraseñas ni variables de entorno sensibles en el repositorio público o privado.
* **Rendimiento:** El shell inicial de la aplicación debe cargar rápidamente. Se comprobará observando los tiempos de respuesta de Next.js.
* **Offline futuro:** El flujo crítico de la app no debe depender de la red. Se comprobará en semanas posteriores usando DevTools (pestaña Network -> Offline) para validar la persistencia web.

## 5. Datos sintéticos y límites

* **Datos ficticios a usar (Datos Sintéticos):** Se utilizarán nombres inventados para los técnicos y ubicaciones ficticias para los laboratorios (ej. "Técnico Prueba", "Laboratorio Alpha").
* **Datos reales excluidos:** Por restricción del curso, está estrictamente prohibido utilizar o solicitar nombres reales de estudiantes, personal administrativo o información institucional confidencial de la UTT (PII).

## 6. Criterios de aceptación de la Semana 1

* **Entrega actual:** La entrega se verifica mediante la ejecución de `npm run verify` o `make verify`.
  * **Aceptación:** El comando debe ejecutar una instalación limpia (`npm ci`), compilar el proyecto (`npm run build`) y generar exitosamente el reporte en `reports/verification.json`.

