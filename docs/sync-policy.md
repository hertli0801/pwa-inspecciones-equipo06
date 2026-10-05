# Política de sincronización — Cola offline

## Resumen

La aplicación permite capturar inspecciones sin conexión. Cada inspección se
guarda en una cola local (`localStorage`, clave `pwa-inspecciones:sync-queue:v1`)
y se sincroniza con el servidor cuando hay red disponible.

## Idempotencia

Cada elemento de la cola tiene un `clientId` único, generado en el cliente
(`crypto.randomUUID()` cuando está disponible). Este id es la clave que evita
duplicados: si el envío se reintenta (por ejemplo, tras perder la conexión a
medio camino), el servidor reconoce el mismo `clientId` y no crea un segundo
registro.

## Reintentos

Un elemento que falla al sincronizar pasa a estado `failed` y su contador
`attempts` se incrementa. En la siguiente llamada a `syncAll()`, los elementos
`failed` se vuelven a intentar automáticamente, sin acción manual del usuario.

## Respuestas fuera de orden

Si el usuario edita una inspección mientras una sincronización anterior sigue
en curso, `version` se incrementa. Antes de aplicar el resultado de un envío,
se compara la versión guardada contra la versión que tenía el elemento cuando
se inició ese envío. Si no coinciden, la respuesta se descarta: así, una
respuesta lenta de una versión vieja nunca sobrescribe una edición más
reciente del usuario.

## Resolución de conflictos: Last-Write-Wins (LWW)

Cuando el cliente y el servidor reportan versiones distintas de la misma
inspección, se usa la política definida en `conflict-policy.ts`:

- Gana quien tenga el `updatedAt` más reciente (comparando con `Date.parse`,
  en milisegundos, no como texto).
- En un **empate exacto**, gana el remoto. Es una decisión explícita: el
  servidor se trata como fuente de verdad cuando no se puede determinar cuál
  edición ocurrió después, para que un dispositivo con el reloj desajustado
  no gane siempre.
- Una fecha inválida (`NaN`) pierde frente a una fecha válida, para que un
  registro corrupto no sobrescriba datos buenos.

### Por qué LWW y no otra alternativa

Se eligió Last-Write-Wins en lugar de vectores de versión o fusión campo por
campo porque es determinista, fácil de probar y suficiente para el alcance
actual del proyecto. Las alternativas requieren metadatos adicionales por
dispositivo (vectores de versión) o reglas de fusión por cada campo, lo cual
excede el alcance de esta entrega.

## Riesgo conocido y trabajo futuro

LWW pierde datos sin avisar: si dos dispositivos editan la misma inspección
casi al mismo tiempo, se conserva una versión completa y se descarta la otra,
sin fusionar campos ni notificar al usuario. Además depende de los relojes de
los dispositivos — un reloj desfasado puede hacer ganar a una edición que en
realidad fue anterior.

Como trabajo futuro se considera:
- Vectores de versión para detectar conflictos reales en vez de solo comparar
  timestamps.
- Fusión de campos no conflictivos en vez de descartar el registro completo.
- Notificar al usuario cuando se pierde una edición por conflicto, en vez de
  resolverlo en silencio.

## Persistencia ante fallos

`parseQueue` (en `schema.ts`) nunca lanza excepciones: si el contenido de
`localStorage` está corrupto (JSON inválido, estructura inesperada, un
registro incompleto por un cierre de pestaña a medio guardar), se descarta lo
inválido en vez de tumbar la aplicación al arrancar.