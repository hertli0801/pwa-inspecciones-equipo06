# Inventario de datos y privacidad — Semana 9


## 1. Marco aplicable

La universidad es un sujeto obligado: trata datos personales conforme al marco de protección de datos personales aplicable a sujetos obligados (el instrumento legal específico no se verificó en esta entrega; se declara como límite).
Principios que guían este diseño: licitud, finalidad, lealtad, calidad,
proporcionalidad (minimización), información y responsabilidad.

## 2. Inventario

| Dato | ¿Personal? | Dónde vive | Finalidad | Quién accede | Retención | Control |
|------|-----------|-----------|-----------|--------------|-----------|---------|
| Laboratorio inspeccionado | No | Cola local (`localStorage`) y almacén en memoria del servidor | Identificar el espacio inspeccionado | Personal de mantenimiento | Ver nota R | Longitud de 3 a 80 (`validate-inspection.ts`) |
| Resumen de la inspección | Puede contener datos personales si se escribe de más | Igual | Describir el estado del equipo | Igual | Ver nota R | Máx. 500 caracteres y sin marcado activo (`input-guard.ts`) |
| Nombre del inspector | Sí (identifica a una persona) | Igual | Responsabilidad del registro | Personal de mantenimiento y supervisión | Ver nota R | Máx. 80 caracteres; en el proyecto es ficticio |
| Número de hallazgos | No | Igual | Seguimiento de mantenimiento | Igual | Ver nota R | Entero de 0 a 999 |
| Fecha de inspección | No | Igual | Trazabilidad | Igual | Ver nota R | Fecha real y no futura |
| Ubicación aproximada | Sí (sensible por su naturaleza) | Solo en pantalla al capturar; el servidor no la almacena (guarda `clientId`, `version` y los 5 campos del `payload`) (no se verificó si se guarda en la cola local) | Mostrar al inspector una referencia de ubicación al capturar | La persona que captura | Mientras dure la pantalla (no verificado) | Coordenadas redondeadas (`geolocation.ts`); `geolocation=(self)`; la captura funciona si se niega el permiso |
| Foto adjunta (cámara) | Puede ser personal si aparece una persona | **No se guarda la imagen**: solo tipo y tamaño (`src/lib/device/camera.ts`); la foto es sintética (120 KB) | Evidencia opcional del estado del equipo | La persona que captura | No aplica: no se conserva la imagen | Sin nombre de archivo ni metadatos; `camera=(self)`; la inspección se guarda aunque se niegue el permiso |
| Identificador de cliente (`clientId`) | Seudónimo | Cola local (lo genera) y servidor (clave del almacén) | Sincronización idempotente: evitar duplicados | Sistema | Ver nota R | El servidor solo exige texto no vacío (`handlers.ts`) |

**Nota R (retención).** En el servidor los registros viven en memoria y se pierden al
reiniciar. En el dispositivo permanecen en `localStorage` mientras la cola no se limpie
(no se verificó cuándo se elimina un elemento ya sincronizado). No hay una política de
retención formal: se declara como límite.

## 3. Decisiones de minimización

- El servidor solo acepta en `payload` cinco campos (laboratorio, resumen, inspector,
  hallazgos y fecha) y rechaza cualquier otro (`src/lib/security/input-guard.ts`).
- La ubicación se redondea antes de usarse (`roundCoordinate` en `geolocation.ts`).
- De la foto solo se conservan tipo y tamaño, sin nombre de archivo ni metadatos.
- No se recolectan correo, teléfono, matrícula ni número de empleado.
- La ubicación y la foto son opcionales: si el permiso se niega o falta, la captura
  sigue funcionando (cubierto por las pruebas E2E de la semana 8).
- El servidor de demostración no usa base de datos real: el almacén es un `Map` en
  memoria (`server-store.ts`).

## 4. Transferencias y terceros

- Ninguna: la CSP restringe las conexiones a `'self'` (`connect-src 'self'`), así que el
  navegador bloquea peticiones a terceros.

## 5. Derechos y aviso

- Un despliegue real necesita aviso de privacidad (integral y simplificado) y
  un procedimiento para derechos de acceso, rectificación, cancelación y
  oposición. **No incluidos en esta entrega**; se declaran como límite.

## 6. Riesgos y límites

- La cola local y la caché del navegador no están cifradas (ver T11 en
  `docs/threat-model.md`).
- El resumen es texto libre: una persona podría escribir datos personales de
  terceros. Mitigación pendiente: capacitación y mensaje en el formulario.
- Falta definir periodos de retención formales (se declara como límite en esta entrega).
