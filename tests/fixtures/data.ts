// Datos sintéticos para las pruebas de la Semana 8. No hay datos reales.

import type { InspectionInput } from "../../src/lib/sync/validate-inspection";

// "Hoy" fijo para que las pruebas den el mismo resultado cualquier día.
// Se crea con componentes locales (año, mes 0-11, día) a mediodía.
export const NOW = new Date(2026, 9, 24, 12, 0, 0); // 24 de octubre de 2026

export const validInput: InspectionInput = {
  location: "Laboratorio de Redes",
  summary: "Revisión sintética de prueba",
  inspector: "Técnica A",
  findings: "2",
  date: "2026-10-20",
};

/** Copia de validInput con algunos campos cambiados. */
export function withFields(changes: Partial<InspectionInput>): InspectionInput {
  return { ...validInput, ...changes };
}