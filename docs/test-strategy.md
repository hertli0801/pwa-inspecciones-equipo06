# Estrategia de pruebas — PWA Inspecciones



## 1. Objetivo



Verificar los comportamientos críticos de la aplicación: validación de datos, captura sin conexión, persistencia local y sincronización con el servidor sin duplicar registros.



## 2. Niveles de prueba



### Pruebas unitarias



Ubicación: `tests/unit/`



- `sync-queue-rules.spec.ts`: verifica estados de la cola, reintentos, excepciones, control de versiones e idempotencia.

- `validate-inspection.spec.ts`: verifica campos obligatorios, límites, fechas, errores de validación y guardado de capturas válidas.



### Pruebas de integración



Ubicación: `tests/integration/`



- `offline-persistence.spec.ts`: comprueba la persistencia sin conexión, la recuperación después de recargar y la sincronización posterior.

- `sync-idempotency.spec.ts`: comprueba que los reintentos, las respuestas perdidas y los errores del servidor no generen registros duplicados.



### Pruebas de extremo a extremo (E2E)



Ubicación: `tests/e2e/`



- `capture-sync.spec.ts`: comprueba captura, recarga, reconexión y sincronización; ubicación denegada o ausente; y rechazo de capturas inválidas.



Las pruebas E2E utilizan Playwright con Chromium y un solo worker para evitar interferencias entre pruebas que comparten el servidor de demostración.



## 3. Ejecución local



Instalar dependencias:



```bash

npm ci

```



Ejecutar las pruebas:



```bash

npm test

npm run test:unit

npm run test:integration

npm run test:e2e

```



Ejecutar las comprobaciones:



```bash

npm run typecheck

npm run lint

npm run build

npm run verify

```



En Windows, si `make` no está instalado, se puede ejecutar `npm run verify` directamente.



## 4. Integración continua



El workflow `.github/workflows/academic-evaluation.yml` instala las dependencias, instala Chromium para Playwright y ejecuta las comprobaciones automatizadas. La ejecución real del workflow debe confirmarse en GitHub Actions.



## 5. Criterios de aceptación



- Las pruebas automatizadas terminan sin fallos.

- TypeScript y la compilación de producción terminan correctamente.

- Las capturas inválidas no se guardan.

- La captura sin conexión no depende de una solicitud inmediata a la red.

- Los reintentos de sincronización no duplican registros.

- La ubicación denegada o ausente no bloquea la captura.



## 6. Limitaciones



Las pruebas automatizadas no sustituyen las pruebas en dispositivos físicos, distintos navegadores ni la evaluación de un servicio de sincronización desplegado en producción.



Los resultados locales solo describen las ejecuciones realizadas en ese entorno. La ejecución de GitHub Actions debe verificarse por separado.



No se declara un porcentaje de cobertura sin generar y revisar un informe de cobertura.

