// Endpoint sintético de sincronización — Semana 8.
//
// Adapta handlers.ts a Next. Los registros viven en memoria (datos
// sintéticos, sin base de datos real) y se pierden al reiniciar el servidor.

import { NextRequest, NextResponse } from "next/server";
import { createServerStore, type ServerStore } from "../../../lib/sync/server-store";
import { handleSyncDelete, handleSyncGet, handleSyncPost } from "../../../lib/sync/handlers";
import { isPlainObject, parseInspectionPayload, readJsonBody } from "../../../lib/security";

// Sin esto Next genera GET de forma estática en el build y siempre
// respondería la lista vacía.
export const dynamic = "force-dynamic";

// En desarrollo Next recarga el módulo; guardarlo en globalThis evita que
// el almacén se reinicie con cada cambio.
const globalStore = globalThis as typeof globalThis & { __syncStore?: ServerStore };
const store = (globalStore.__syncStore ??= createServerStore());

// Recibe una inspección y la registra usando clientId como clave.
// Recibe una inspección y la registra usando clientId como clave.
//
// Semana 9: nada de lo que llega por la red es confiable. Antes de procesar se
// comprueba el tipo de contenido, el tamaño real del cuerpo y la forma de los
// datos. Las respuestas de error son genéricas: no devuelven lo que se envió.
export async function POST(request: NextRequest) {
  const forceFailure = request.nextUrl.searchParams.get("fail") === "1";

  // 415 (tipo de contenido), 413 (más de 16 KiB) o 400 (JSON roto o vacío).
  const body = await readJsonBody(request);
  if (!body.ok) {
    return NextResponse.json({ ok: false, reason: body.error }, { status: body.status });
  }

  // El sobre trae clientId y version (los revisa handleSyncPost); la inspección va en `payload`.
  if (!isPlainObject(body.value)) {
    return NextResponse.json({ ok: false, reason: "invalid-body" }, { status: 400 });
  }
  const parsed = parseInspectionPayload(body.value.payload, new Date());
  if (!parsed.ok) {
    return NextResponse.json({ ok: false, reason: "invalid-payload" }, { status: 400 });
  }

  // A partir de aquí solo se usa el payload ya validado y limpio.
  const result = handleSyncPost(store, { ...body.value, payload: parsed.payload }, { forceFailure });
  return NextResponse.json(result.body, { status: result.status });
}

// Consulta los registros guardados en memoria.
export async function GET() {
  const result = handleSyncGet(store);
  return NextResponse.json(result.body, { status: result.status });
}

// Limpia los registros; útil para preparar las pruebas.
export async function DELETE() {
  const result = handleSyncDelete(store);
  return NextResponse.json(result.body, { status: result.status });
}
