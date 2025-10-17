/* ============================================================================
   REQUIREMENT TRACEABILITY
   ============================================================================
   Requirement ID: REQ-UTILS-FORMATTERS-001
   User Story: As a user, I want numbers and units formatted consistently and safely.
   Acceptance Criteria:
     - Safe number formatting with fallbacks (Intl when available)
     - Utilities to convert/format units (e.g., temperature labels)
     - JSDoc and PUBLIC_INTERFACE markers for public functions
   GxP Impact: NO - Formatting utilities only; no business logic.
   Risk Level: LOW
   Validation Protocol: N/A
   ============================================================================ */

import { TEMPERATURE_UNIT_LABELS, TEMPERATURE_UNITS } from "./constants";

/**
 * Internal: safely determine if a value is a finite number.
 * @param {any} v
 */
function isFiniteNumber(v) {
  return typeof v === "number" && Number.isFinite(v);
}

/**
 * PUBLIC_INTERFACE
 * formatNumber
 * Format a number using Intl.NumberFormat when available; falls back gracefully.
 *
 * @param {number} value - Number to format
 * @param {{ locales?: string|string[], maximumFractionDigits?: number, minimumFractionDigits?: number, useGrouping?: boolean }} [options]
 * @returns {string} Formatted string or a safe fallback
 */
export function formatNumber(value, options = {}) {
  const {
    locales = undefined,
    maximumFractionDigits = 8,
    minimumFractionDigits = 0,
    useGrouping = true,
  } = options;

  if (!isFiniteNumber(value)) {
    // Provide stable, safe fallback for non-finite values
    if (value === Infinity) return "∞";
    if (value === -Infinity) return "-∞";
    if (Number.isNaN(value)) return "NaN";
    return String(value);
  }

  try {
    if (typeof Intl !== "undefined" && Intl.NumberFormat) {
      const nf = new Intl.NumberFormat(locales, {
        maximumFractionDigits,
        minimumFractionDigits,
        useGrouping,
      });
      return nf.format(value);
    }
  } catch {
    // ignore and use fallback
  }

  // Simple fallback formatting
  return value.toFixed(Math.min(Math.max(minimumFractionDigits, 0), maximumFractionDigits));
}

/**
 * PUBLIC_INTERFACE
 * toFixedSafe
 * Provide a safe toFixed behavior that guards against invalid inputs and extreme values.
 *
 * @param {number} value - number to format
 * @param {number} fractionDigits - number of fraction digits
 * @returns {string}
 */
export function toFixedSafe(value, fractionDigits) {
  if (!isFiniteNumber(value)) {
    return String(value);
  }
  const fd = Math.min(20, Math.max(0, Math.floor(fractionDigits || 0)));
  try {
    return value.toFixed(fd);
  } catch {
    return String(value);
  }
}

/**
 * PUBLIC_INTERFACE
 * parseNumericInput
 * Parse a locale-agnostic numeric input safely.
 * - Trims whitespace
 * - Removes thousands separators (comma or space)
 * - Accepts dot as decimal separator
 *
 * @param {string|number|null|undefined} input
 * @returns {number|null} Parsed finite number or null when not parseable
 */
export function parseNumericInput(input) {
  if (input == null) return null;
  if (typeof input === "number") return Number.isFinite(input) ? input : null;
  if (typeof input !== "string") return null;

  const trimmed = input.trim();
  if (!trimmed) return null;

  // Remove common thousands separators: commas or spaces
  const normalized = trimmed.replace(/(?<=\d)[,\s](?=\d{3}\b)/g, "").replace(/\s+/g, "");
  const parsed = Number.parseFloat(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

/**
 * PUBLIC_INTERFACE
 * getTemperatureUnitLabel
 * Return a user-friendly label for a temperature unit.
 *
 * @param {"C"|"F"|"K"|string} unit
 * @returns {string} Pretty label (e.g., "°C")
 */
export function getTemperatureUnitLabel(unit) {
  const key = String(unit || "").toUpperCase();
  return TEMPERATURE_UNIT_LABELS[key] || unit;
}

/**
 * PUBLIC_INTERFACE
 * formatWithUnit
 * Format a numeric value with a provided unit label.
 *
 * @param {number} value
 * @param {"C"|"F"|"K"|string} unit
 * @param {{ locales?: string|string[], maximumFractionDigits?: number, minimumFractionDigits?: number }} [options]
 * @returns {string}
 */
export function formatWithUnit(value, unit, options = {}) {
  const label = getTemperatureUnitLabel(unit);
  return `${formatNumber(value, options)} ${label}`;
}

/**
 * PUBLIC_INTERFACE
 * isSupportedTemperatureUnit
 * Determine if a unit is one of the supported temperature units.
 *
 * @param {string} unit
 * @returns {boolean}
 */
export function isSupportedTemperatureUnit(unit) {
  const u = String(unit || "").toUpperCase();
  return u === TEMPERATURE_UNITS.C || u === TEMPERATURE_UNITS.F || u === TEMPERATURE_UNITS.K;
}
