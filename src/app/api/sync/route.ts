// Endpoint sintético de sincronización para la Semana 8.
//
// Permite probar el envío de inspecciones por red usando datos sintéticos.
// No utiliza una base de datos real: los registros viven en memoria.

import { NextRequest, NextResponse } from "next/server";

type StoredRecord = {
  clientId: string;
  payload: unknown;
  receivedAt: string;
  writes: number;
};

// Almacenamiento temporal en memoria.
const serverDb = new Map<string, StoredRecord>();

// Recibe una inspección y la registra usando clientId como clave.
export async function POST(request: NextRequest) {
  const url = new URL(request.url);

  // Permite simular un fallo para las pruebas.
  if (url.searchParams.get("fail") === "1") {
    return NextResponse.json(
      { ok: false, reason: "forced-failure" },
      { status: 503 }
    );
  }

  const body = (await request.json()) as {
    clientId?: string;
    payload?: unknown;
  };

  if (!body.clientId) {
    return NextResponse.json(
      { ok: false, reason: "missing-clientId" },
      { status: 400 }
    );
  }

  const existing = serverDb.get(body.clientId);

  serverDb.set(body.clientId, {
    clientId: body.clientId,
    payload: body.payload,
    receivedAt: new Date().toISOString(),
    writes: (existing?.writes ?? 0) + 1,
  });

  return NextResponse.json({
    ok: true,
    serverId: `srv-${body.clientId}`,
    updatedAt: new Date().toISOString(),
  });
}

// Consulta los registros guardados en memoria.
export async function GET() {
  return NextResponse.json({
    count: serverDb.size,
    records: Array.from(serverDb.values()),
  });
}

// Limpia los registros; útil para preparar las pruebas.
export async function DELETE() {
  serverDb.clear();

  return NextResponse.json({ ok: true });
}