# Requisitos del producto — completar en Semana 1

> Conserva estos encabezados y reemplaza las instrucciones por tu análisis. No uses datos reales.

## 1. Problema y contexto

* **Problema a resolver:** El personal de mantenimiento tiene dificultades para registrar las inspecciones de los laboratorios en la base de datos debido a las caídas constantes de red (conectividad intermitente) dentro de la UTT.
* **Contexto:** Los técnicos realizan rondines preventivos y correctivos usando dispositivos móviles dentro de los laboratorios.
* **Límites (Qué queda fuera):** El sistema no incluirá chat, inventario de hardware, órdenes de compra ni asignación automática de turnos. Solo se enfoca en el registro y consulta de la inspección.

## 2. Usuarios y escenarios

* **Usuario Principal:** Técnico de mantenimiento.
* **Escenario 1 (Conexión normal):** Situación inicial: El técnico inspecciona un laboratorio con buena señal Wi-Fi. Acción: Registra un hallazgo (ej. "cableado expuesto") y guarda el formulario. Resultado esperado: Los datos se guardan instantáneamente en el servidor.
* **Escenario 2 (Conectividad intermitente - OBLIGATORIO):** Situación inicial: El técnico se encuentra en un sótano o laboratorio sin señal. Acción: Llena el formulario de inspección y presiona guardar. Resultado esperado: El sistema guarda el registro localmente en el dispositivo sin bloquear la pantalla y lo sincroniza automáticamente cuando regresa la red.

## 3. Requisitos funcionales

* **RF-01 (Vinculado al Escenario 1):** El sistema debe permitir registrar una nueva inspección (laboratorio, fecha y hallazgo).
  * **Condición de Aceptación:** Al guardar con datos válidos y red activa, el registro aparece de inmediato en la lista del historial.
* **RF-02 (Vinculado al Escenario 2):** El sistema debe permitir la captura offline de inspecciones.
  * **Condición de Aceptación:** Al guardar sin conexión, se muestra un indicador visual de "guardado local" y el registro persiste al recargar la página.
* **RF-03 (Vinculado al Escenario 1 y 2):** El sistema debe permitir consultar el historial de inspecciones registradas, mostrando el estado de cada una ("Sin incidencias" / "Requiere atención").
  * **Condición de Aceptación:** Al abrir la vista principal, se muestra la lista de inspecciones con laboratorio, responsable, fecha y estado visible, sin necesidad de abrir cada registro por separado.

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

