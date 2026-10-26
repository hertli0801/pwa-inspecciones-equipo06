import assert from "node:assert/strict";
import {
  validateInspection,
  isRealDate,
  toDateString,
} from "../../src/lib/sync/validate-inspection";
import { captureInspection } from "../../src/lib/sync/capture-flow";
import { createMemoryStorage, SyncQueue } from "../../src/lib/sync/queue";
import { NOW, validInput, withFields } from "../fixtures/data";

let passed = 0;
let failed = 0;

function test(name: string, fn: () => void) {
  try {
    fn();
    passed++;
    console.log(`  ok   ${name}`);
  } catch (error) {
    failed++;
    console.log(`  FAIL ${name}`);
    console.log(`       ${(error as Error).message}`);
  }
}

function errorsOf(changes: Parameters<typeof withFields>[0], now = NOW) {
  const result = validateInspection(withFields(changes), now);
  return result.ok ? null : result.errors;
}

console.log("Laboratorio");

test("1. entrada válida completa se acepta y devuelve el payload", () => {
  const result = validateInspection(validInput, NOW);
  assert.equal(result.ok, true);
  if (result.ok) {
    assert.deepEqual(result.payload, {
      location: "Laboratorio de Redes",
      summary: "Revisión sintética de prueba",
      inspector: "Técnica A",
      findings: 2,
      date: "2026-10-20",
    });
  }
});

test("2. laboratorio de 2 caracteres es inválido", () => {
  assert.ok(errorsOf({ location: "ab" })?.location);
});

test("3. laboratorio de 3 caracteres es válido (límite inferior)", () => {
  assert.equal(errorsOf({ location: "abc" }), null);
});

test("4. laboratorio de 80 caracteres es válido (límite superior)", () => {
  assert.equal(errorsOf({ location: "a".repeat(80) }), null);
});

test("5. laboratorio de 81 caracteres es inválido", () => {
  assert.ok(errorsOf({ location: "a".repeat(81) })?.location);
});

test("6. laboratorio solo con espacios es inválido", () => {
  assert.ok(errorsOf({ location: "     " })?.location);
});

test("7. el payload devuelto recorta espacios sobrantes", () => {
  const result = validateInspection(withFields({ location: "  Lab Redes  " }), NOW);
  assert.equal(result.ok && result.payload.location, "Lab Redes");
});

console.log("Hallazgos");

test("8. hallazgos '0' es válido (límite inferior)", () => {
  const result = validateInspection(withFields({ findings: "0" }), NOW);
  assert.equal(result.ok && result.payload.findings, 0);
});

test("9. hallazgos '999' es válido (límite superior)", () => {
  const result = validateInspection(withFields({ findings: "999" }), NOW);
  assert.equal(result.ok && result.payload.findings, 999);
});

test("10. hallazgos '-1' es inválido", () => {
  assert.ok(errorsOf({ findings: "-1" })?.findings);
});

test("11. hallazgos '1000' es inválido", () => {
  assert.ok(errorsOf({ findings: "1000" })?.findings);
});

test("12. hallazgos decimal '2.5' es inválido", () => {
  assert.ok(errorsOf({ findings: "2.5" })?.findings);
});

test("13. hallazgos con texto 'abc' es inválido", () => {
  assert.ok(errorsOf({ findings: "abc" })?.findings);
});

test("14. hallazgos vacío es inválido (Number('') daría 0)", () => {
  assert.ok(errorsOf({ findings: "" })?.findings);
});

test("15. hallazgos numérico entero 5 es válido", () => {
  assert.equal(errorsOf({ findings: 5 }), null);
});

console.log("Fecha");

test("16. fecha de hoy es válida", () => {
  assert.equal(errorsOf({ date: "2026-10-24" }), null);
});

test("17. fecha de mañana es inválida (futura)", () => {
  assert.equal(errorsOf({ date: "2026-10-25" })?.date, "La fecha no puede ser futura.");
});

test("18. 2026-02-30 es inválida (el día no existe)", () => {
  assert.ok(errorsOf({ date: "2026-02-30" })?.date);
  assert.equal(isRealDate("2026-02-30"), false);
  assert.equal(isRealDate("2028-02-29"), true); // 2028 es bisiesto
});

test("19. formato '24/10/2026' es inválido", () => {
  assert.ok(errorsOf({ date: "24/10/2026" })?.date);
});

test("20. 'now' inyectado: la misma fecha cambia de resultado según now", () => {
  const input = withFields({ date: "2026-10-24" });
  const antes = validateInspection(input, new Date(2026, 9, 23, 12, 0, 0));
  const hoy = validateInspection(input, new Date(2026, 9, 24, 12, 0, 0));
  assert.equal(antes.ok, false);
  assert.equal(hoy.ok, true);
});

console.log("Resumen, inspector y errores múltiples");

test("21. resumen vacío es inválido", () => {
  assert.ok(errorsOf({ summary: "   " })?.summary);
});

test("22. inspector vacío es inválido", () => {
  assert.ok(errorsOf({ inspector: "" })?.inspector);
});

test("23. varios errores se reportan juntos", () => {
  const errors = errorsOf({ location: "a", findings: "x", date: "2099-01-01" });
  assert.ok(errors?.location && errors.findings && errors.date);
});

console.log("Flujo de captura (guardar no toca la red)");

test("24. captura válida se guarda en la cola como pending", () => {
  const queue = new SyncQueue(createMemoryStorage());
  const result = captureInspection(queue, validInput, NOW);
  assert.equal(result.ok, true);
  assert.equal(queue.list().length, 1);
  assert.equal(queue.list()[0].status, "pending");
});

test("25. captura inválida no guarda nada", () => {
  const queue = new SyncQueue(createMemoryStorage());
  const result = captureInspection(queue, withFields({ findings: "1000" }), NOW);
  assert.equal(result.ok, false);
  assert.equal(queue.list().length, 0);
});

test("26. guardar no usa fetch (funciona sin red)", () => {
  const original = globalThis.fetch;
  let llamadas = 0;
  globalThis.fetch = (() => {
    llamadas++;
    throw new Error("sin red");
  }) as typeof fetch;
  try {
    const queue = new SyncQueue(createMemoryStorage());
    assert.equal(captureInspection(queue, validInput, NOW).ok, true);
    assert.equal(llamadas, 0);
  } finally {
    globalThis.fetch = original;
  }
});

test("toDateString usa año-mes-día con ceros", () => {
  assert.equal(toDateString(new Date(2026, 0, 5, 12)), "2026-01-05");
});

console.log(`\nvalidate-inspection.spec.ts: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);