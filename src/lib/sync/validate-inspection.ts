// Validación de una inspección antes de guardarla — Semana 8.
//
// Función pura: no lee el reloj, no toca la red ni el almacenamiento.
// Por eso `now` se recibe como parámetro (inyección): así la regla de
// "fecha no futura" se puede probar con una fecha fija, sin depender del
// día en que se ejecuten las pruebas.

import type { InspectionPayload } from "../storage/schema";

export const LAB_MIN_LENGTH = 3;
export const LAB_MAX_LENGTH = 80;
export const FINDINGS_MIN = 0;
export const FINDINGS_MAX = 999;

export type InspectionInput = {
  location: string;
  summary: string;
  inspector: string;
  findings: string | number;
  date: string;
};

export type InspectionField = keyof InspectionInput;

export type ValidationResult =
  | { ok: true; payload: InspectionPayload }
  | { ok: false; errors: Partial<Record<InspectionField, string>> };

/** Convierte una fecha a "YYYY-MM-DD" usando la zona horaria local. */
export function toDateString(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** true si el texto es "YYYY-MM-DD" y corresponde a un día que existe. */
export function isRealDate(value: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return false;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);

  // Si el día no existe (ej. 2026-02-30), Date lo "desborda" al mes
  // siguiente y los componentes ya no coinciden con lo escrito.
  const candidate = new Date(year, month - 1, day);
  return (
    candidate.getFullYear() === year &&
    candidate.getMonth() === month - 1 &&
    candidate.getDate() === day
  );
}

/** Convierte hallazgos a entero; devuelve null si no es un entero válido. */
function parseFindings(value: string | number): number | null {
  if (typeof value === "number") {
    return Number.isInteger(value) ? value : null;
  }
  const text = value.trim();
  // Number("") es 0, así que un campo vacío se rechaza antes de convertir.
  if (!/^-?\d+$/.test(text)) return null;
  return Number(text);
}

export function validateInspection(
  input: InspectionInput,
  now: Date
): ValidationResult {
  const errors: Partial<Record<InspectionField, string>> = {};

  const location = input.location.trim();
  const summary = input.summary.trim();
  const inspector = input.inspector.trim();
  const date = input.date.trim();

  // 1. Laboratorio: longitud entre LAB_MIN_LENGTH y LAB_MAX_LENGTH.
  if (location.length < LAB_MIN_LENGTH || location.length > LAB_MAX_LENGTH) {
    errors.location = `El laboratorio debe tener entre ${LAB_MIN_LENGTH} y ${LAB_MAX_LENGTH} caracteres.`;
  }

  if (summary.length === 0) {
    errors.summary = "El resumen es obligatorio.";
  }

  if (inspector.length === 0) {
    errors.inspector = "El inspector es obligatorio.";
  }

  // 2. Hallazgos: entero entre FINDINGS_MIN y FINDINGS_MAX.
  const findings = parseFindings(input.findings);
  if (findings === null || findings < FINDINGS_MIN || findings > FINDINGS_MAX) {
    errors.findings = `Los hallazgos deben ser un entero entre ${FINDINGS_MIN} y ${FINDINGS_MAX}.`;
  }

  // 3. Fecha: debe existir y no ser posterior a hoy (según `now`).
  if (!isRealDate(date)) {
    errors.date = "La fecha no es válida (formato AAAA-MM-DD).";
  } else if (date > toDateString(now)) {
    // Comparar "YYYY-MM-DD" como texto equivale a comparar fechas.
    errors.date = "La fecha no puede ser futura.";
  }

  if (Object.keys(errors).length > 0) {
    return { ok: false, errors };
  }

  return {
    ok: true,
    payload: { location, summary, inspector, findings: findings as number, date },
  };
}