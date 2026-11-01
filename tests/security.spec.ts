// Pruebas de seguridad — Semana 9. Datos sintéticos; "hoy" se inyecta.
//
// Los valores con forma de credencial se arman por partes en tiempo de ejecución:
// así el repositorio no contiene ninguna cadena que parezca una credencial real.

import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import {
  containsActiveMarkup,
  envOrDevDefault,
  findCredentialLeaks,
  isSensitiveKey,
  parseInspectionPayload,
  readJsonBody,
  redactForLog,
  REDACTED,
  requireEnv,
  stripControlChars,
} from "../src/lib/security";

const NOW = new Date(2026, 9, 29); // 29 de octubre de 2026
const valid = {
  location: "Laboratorio de Redes",
  summary: "Revisión sintética de prueba",
  inspector: "Técnica A",
  findings: 2,
  date: "2026-10-20",
};

const cases: { name: string; fn: () => void | Promise<void> }[] = [];
function test(name: string, fn: () => void | Promise<void>) {
  cases.push({ name, fn });
}

function jsonRequest(body: BodyInit | null, contentType = "application/json"): Request {
  return new Request("http://localhost/api/sync", {
    method: "POST",
    headers: { "content-type": contentType },
    body,
  });
}

function expectRejected(raw: unknown, code: string) {
  const result = parseInspectionPayload(raw, NOW);
  assert.equal(result.ok, false, `debía rechazarse con ${code}`);
  if (!result.ok) assert.equal(result.code, code);
}

// ---------------------------------------------------------------- Validación

test("1. acepta una inspección válida y entrega el payload limpio", () => {
  const result = parseInspectionPayload({ ...valid, location: "  Laboratorio de Redes  " }, NOW);
  assert.equal(result.ok, true);
  if (result.ok) assert.deepEqual(result.payload, valid);
});

test("2. rechaza campos extra", () => {
  expectRejected({ ...valid, admin: true }, "unknown-field");
});

test("3. rechaza __proto__ y constructor como claves", () => {
  const withProto = JSON.parse(`{"__proto__":{"admin":true},"location":"Lab","summary":"x","inspector":"y","findings":1,"date":"2026-10-20"}`);
  expectRejected(withProto, "unknown-field");
  expectRejected({ ...valid, constructor: { prototype: {} } }, "unknown-field");
});

test("4. rechaza cuerpos que no son un objeto simple", () => {
  for (const raw of [[], null, "texto", 42, [valid], undefined]) expectRejected(raw, "not-object");
});

test("5. rechaza tipos incorrectos", () => {
  expectRejected({ ...valid, location: 123 }, "bad-type");
  expectRejected({ ...valid, summary: ["x"] }, "bad-type");
  expectRejected({ ...valid, findings: {} }, "bad-type");
  expectRejected({ ...valid, findings: null }, "bad-type");
  const { date: _date, ...withoutDate } = valid;
  expectRejected(withoutDate, "bad-type");
});

test("6. rechaza marcado activo (etiquetas y esquemas peligrosos)", () => {
  expectRejected({ ...valid, summary: "<script>alert(1)</script>" }, "active-markup");
  expectRejected({ ...valid, location: "<img src=x onerror=alert(1)>" }, "active-markup");
  expectRejected({ ...valid, inspector: "javascript:alert(1)" }, "active-markup");
  expectRejected({ ...valid, summary: "< SCRIPT >x" }, "active-markup");
  expectRejected({ ...valid, summary: "<svg onload=x>" }, "active-markup");
});

test("7. el resumen admite 500 caracteres y rechaza 501", () => {
  assert.equal(parseInspectionPayload({ ...valid, summary: "a".repeat(500) }, NOW).ok, true);
  expectRejected({ ...valid, summary: "a".repeat(501) }, "too-long");
  expectRejected({ ...valid, inspector: "a".repeat(81) }, "too-long");
});

test("8. un campo gigante se rechaza por el tope duro", () => {
  expectRejected({ ...valid, summary: "a".repeat(2001) }, "too-long");
  expectRejected({ ...valid, findings: "1".repeat(17) }, "too-long");
});

test("9. una fecha futura se rechaza (la regla de la semana 8 sigue activa)", () => {
  const result = parseInspectionPayload({ ...valid, date: "2026-12-01" }, NOW);
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.code, "invalid-values");
    assert.deepEqual(result.fields, ["date"]);
  }
});

test("10. un '<' suelto es una observación válida", () => {
  assert.equal(containsActiveMarkup("Voltaje < 5V en el banco 3"), false);
  const result = parseInspectionPayload({ ...valid, summary: "Voltaje < 5V en el banco 3" }, NOW);
  assert.equal(result.ok, true);
  if (result.ok) assert.equal(result.payload.summary, "Voltaje < 5V en el banco 3");
});

test("11. limpia caracteres de control; en campos de una línea se rechazan", () => {
  const dirty = "a\u0000b\u0007c\td\ne";
  assert.equal(stripControlChars(dirty, false), "abcde");
  assert.equal(stripControlChars(dirty, true), "abc\td\ne");
  expectRejected({ ...valid, location: "Lab\u0000Redes" }, "control-chars");
  assert.equal(parseInspectionPayload({ ...valid, summary: "línea 1\nlínea 2" }, NOW).ok, true);
});

test("12. los errores no reflejan lo que mandó el cliente", () => {
  const attacks: unknown[] = [
    { ...valid, summary: "<script>MARCA_UNICA_AAA</script>" },
    { ...valid, CLAVE_EXTRA_BBB: "MARCA_UNICA_CCC" },
    { ...valid, location: "x".repeat(2001) + "MARCA_UNICA_DDD" },
    { ...valid, date: "9999-99-99 MARCA_UNICA_EEE" },
  ];
  for (const attack of attacks) {
    const text = JSON.stringify(parseInspectionPayload(attack, NOW));
    for (const mark of ["MARCA_UNICA", "CLAVE_EXTRA", "script"]) {
      assert.equal(text.includes(mark), false, `la respuesta repitió "${mark}"`);
    }
  }
});

// ---------------------------------------------------------------- Cuerpo HTTP

test("13. readJsonBody acepta JSON válido (también con charset)", async () => {
  const plain = await readJsonBody(jsonRequest(JSON.stringify({ a: 1 })));
  assert.deepEqual(plain, { ok: true, value: { a: 1 } });
  const charset = await readJsonBody(jsonRequest(JSON.stringify({ b: 2 }), "application/json; charset=utf-8"));
  assert.deepEqual(charset, { ok: true, value: { b: 2 } });
});

test("14. readJsonBody responde 415 si el tipo de contenido no es JSON", async () => {
  const result = await readJsonBody(jsonRequest("hola", "text/plain"));
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.status, 415);
});

test("15. readJsonBody responde 413 y corta la lectura sin confiar en Content-Length", async () => {
  const tooBig = await readJsonBody(jsonRequest(JSON.stringify({ x: "a".repeat(20000) })));
  assert.equal(tooBig.ok, false);
  if (!tooBig.ok) assert.equal(tooBig.status, 413);

  // Cuerpo en flujo, sin Content-Length: se debe cortar mucho antes de leerlo completo.
  let pulled = 0;
  const stream = new ReadableStream<Uint8Array>({
    pull(controller) {
      pulled += 1;
      controller.enqueue(new Uint8Array(1000).fill(97));
      if (pulled >= 1000) controller.close();
    },
  });
  const request = new Request("http://localhost/api/sync", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: stream,
    duplex: "half",
  } as RequestInit & { duplex: "half" });
  const streamed = await readJsonBody(request);
  assert.equal(streamed.ok, false);
  if (!streamed.ok) assert.equal(streamed.status, 413);
  assert.ok(pulled < 50, `se leyeron ${pulled} fragmentos: debía cortar antes`);
});

test("16. readJsonBody responde 400 con JSON roto o cuerpo vacío", async () => {
  for (const body of ["{no es json", "", "   ", "{\"a\":"]) {
    const result = await readJsonBody(jsonRequest(body));
    assert.equal(result.ok, false);
    if (!result.ok) assert.equal(result.status, 400);
  }
});

// ---------------------------------------------------------------- Entorno y registros

test("17. requireEnv nombra la variable y nunca su valor", () => {
  const env = { OTRA_VARIABLE: "valor-confidencial-123" };
  assert.throws(
    () => requireEnv("VARIABLE_FALTANTE", env),
    (error: Error) => error.message.includes("VARIABLE_FALTANTE") && !error.message.includes("valor-confidencial-123")
  );
  assert.throws(() => requireEnv("VACIA", { VACIA: "   " }), /VACIA/);
  assert.equal(requireEnv("OTRA_VARIABLE", env), "valor-confidencial-123");
});

test("18. envOrDevDefault: valor local en desarrollo y falla cerrada en producción", () => {
  assert.equal(envOrDevDefault("X", "valor-local", { NODE_ENV: "development" }), "valor-local");
  assert.equal(envOrDevDefault("X", "valor-local", { NODE_ENV: "development", X: "real" }), "real");
  assert.throws(() => envOrDevDefault("X", "valor-local", { NODE_ENV: "production" }), /X/);
  assert.equal(envOrDevDefault("X", "valor-local", { NODE_ENV: "production", X: "real" }), "real");
});

const PW = ["pass", "word"].join("");
const TK = ["tok", "en"].join("");

test("19. redactForLog enmascara claves sensibles a cualquier profundidad y los Bearer", () => {
  const bearer = "Bearer " + "abcdefghijklmnopqrstuvwxyz123456";
  const original = {
    user: "inspector-demo",
    [PW]: "valor-1",
    nested: { [TK]: "valor-2", list: [{ Authorization: bearer, ok: "visible" }] },
    note: `cabecera ${bearer} fin`,
  };
  const copy = redactForLog(original) as Record<string, any>;
  assert.equal(copy.user, "inspector-demo");
  assert.equal(copy[PW], REDACTED);
  assert.equal(copy.nested[TK], REDACTED);
  assert.equal(copy.nested.list[0].Authorization, REDACTED);
  assert.equal(copy.nested.list[0].ok, "visible");
  assert.equal(copy.note, `cabecera Bearer ${REDACTED} fin`);
  assert.equal(original[PW], "valor-1", "no debe modificar el original");

  const cyclic: Record<string, unknown> = { a: 1 };
  cyclic.self = cyclic;
  assert.doesNotThrow(() => redactForLog(cyclic));
});

test("20. isSensitiveKey reconoce nombres sensibles y no marca los datos normales", () => {
  const sensitive = [PW, TK, ["api", "-", "key"].join(""), "Authorization", "set-cookie", ["client_", "sec", "ret"].join("")];
  for (const name of sensitive) assert.equal(isSensitiveKey(name), true, name);
  for (const name of ["location", "summary", "inspector", "findings", "date", "version"]) {
    assert.equal(isSensitiveKey(name), false, name);
  }
});

// ---------------------------------------------------------------- Repositorio

function walk(dir: string, found: string[] = []): string[] {
  if (!existsSync(dir)) return found;
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, found);
    else if (/\.(ts|tsx|js|mjs|json|html|css|txt|md|webmanifest|svg)$/.test(entry)) found.push(full);
  }
  return found;
}

test("21. findCredentialLeaks detecta los patrones conocidos y no da falsos positivos", () => {
  const samples: Record<string, string> = {
    "private-key-block": "-----BEGIN " + "RSA PRIVATE" + " KEY-----",
    "aws-access-key-id": "AKIA" + "IOSFODNN7EXAMPLE",
    "github-personal-credential": "gh" + "p_" + "a".repeat(36),
    "jwt-like": ["eyJhbGciOiJIUzI1NiJ9", "eyJzdWIiOiJ0ZXN0In0", "c2lnbmF0dXJhLXNpbnRldGljYQ"].join("."),
    "bearer-header": "Authorization: Bearer " + "x".repeat(24),
  };
  for (const [id, text] of Object.entries(samples)) {
    assert.ok(findCredentialLeaks(text).includes(id), `no detectó ${id}`);
  }
  const clean = [
    "Laboratorio de Redes, hallazgos: 2",
    "El resumen menciona Bearer sin ningún valor",
    "AKIA corto",
    "gh" + "p_corto",
    JSON.stringify(valid),
  ];
  for (const text of clean) assert.deepEqual(findCredentialLeaks(text), [], text);
});

test("22. src/ y public/ no contienen credenciales incrustadas", () => {
  const files = [...walk("src"), ...walk("public")];
  assert.ok(files.length > 10, "el recorrido debía encontrar archivos");
  const leaks = files.flatMap((file) => {
    const ids = findCredentialLeaks(readFileSync(file, "utf8"));
    return ids.map((id) => `${file}: ${id}`);
  });
  assert.deepEqual(leaks, []);
});

test("23. .gitignore excluye los archivos .env", () => {
  const lines = readFileSync(".gitignore", "utf8").split(/\r?\n/).map((line) => line.trim());
  assert.ok(lines.includes(".env") || lines.includes(".env*"), ".gitignore debe excluir .env");
});

// ---------------------------------------------------------------- Ejecución

async function main() {
  let passed = 0;
  for (const { name, fn } of cases) {
    try {
      await fn();
      passed += 1;
      console.log(`  ok   ${name}`);
    } catch (error) {
      console.log(`  FAIL ${name}`);
      console.log(`       ${(error as Error).message}`);
    }
  }
  if (passed === cases.length) {
    console.log(`\n${passed}/${cases.length} pruebas de seguridad en PASS`);
  } else {
    console.log(`\n${passed}/${cases.length} pruebas de seguridad en PASS — hay fallos`);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
