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

## 4. Requisitos no funcionales

Incluye requisitos medibles de reproducibilidad, accesibilidad, seguridad, privacidad, rendimiento y operación offline futura.

## 5. Datos sintéticos y límites

Explica qué datos se usarán para la actividad y qué información está prohibida.

## 6. Criterios de aceptación de la Semana 1

Relaciona cada entrega con una prueba o comando que permita verificarla.

