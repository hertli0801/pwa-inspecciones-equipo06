// Endpoint sintético de sincronización — Semana 8.
//
// Adapta handlers.ts a Next. Los registros viven en memoria (datos
// sintéticos, sin base de datos real) y se pierden al reiniciar el servidor.

import { NextRequest, NextResponse } from "next/server";
import { createServerStore, type ServerStore } from "../../../lib/sync/server-store";
import { handleSyncDelete, handleSyncGet, handleSyncPost } from "../../../lib/sync/handlers";

// Sin esto Next genera GET de forma estática en el build y siempre
// respondería la lista vacía.
export const dynamic = "force-dynamic";

// En desarrollo Next recarga el módulo; guardarlo en globalThis evita que
// el almacén se reinicie con cada cambio.
const globalStore = globalThis as typeof globalThis & { __syncStore?: ServerStore };
const store = (globalStore.__syncStore ??= createServerStore());

// Recibe una inspección y la registra usando clientId como clave.
export async function POST(request: NextRequest) {
  const forceFailure = request.nextUrl.searchParams.get("fail") === "1";

  let body: unknown = null;
  try {
    body = await request.json();
  } catch {
    // JSON inválido: handleSyncPost responde 400.
  }

  const result = handleSyncPost(store, body, { forceFailure });
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
