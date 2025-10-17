/* ============================================================================
   REQUIREMENT TRACEABILITY
   ============================================================================
   Requirement ID: REQ-VALIDATION-SERVICE-001
   User Story: As a user, I want calculator and converter inputs validated with
               clear messages, numeric/decimal constraints, temperature bounds,
               and cross-field rules (e.g., division by zero prevented).
   Acceptance Criteria:
     - Numeric validation with required, integerOnly, min/max, decimal places
     - Cross-field arithmetic validation (division by zero)
     - Temperature checks for absolute zero and unit compatibility (C↔F↔K)
     - Clear error codes/messages with JSDoc and PUBLIC_INTERFACE markers
   GxP Impact: YES - Input validation ensures data accuracy and compliance.
   Risk Level: MEDIUM
   Validation Protocol: VP-VALIDATION-001
   ============================================================================ */

import { ERROR_CODES, ABSOLUTE_ZERO, TEMPERATURE_UNITS, DECIMALS, ARITHMETIC_OPS } from "../utils/constants";
import { createValidationError } from "../utils/errorUtils";

/** Internal Helpers */

/**
 * Check blankness for validation purposes.
 * @param {any} v
 * @returns {boolean} true if null/undefined/empty string after trim
 */
function isBlank(v) {
  if (v == null) return true;
  if (typeof v === "string") return v.trim().length === 0;
  return false;
}

/**
 * Attempt to coerce input into a number.
 * Accepts numbers and numeric strings; returns number or NaN.
 * @param {any} input
 * @returns {number}
 */
function toNumber(input) {
  if (typeof input === "number") return input;
  if (typeof input === "string") {
    const trimmed = input.trim();
    if (!trimmed) return NaN;
    // Strip common thousands separators (comma/space) preceding 3-digit groups
    const normalized = trimmed.replace(/(?<=\d)[,\s](?=\d{3}\b)/g, "").replace(/\s+/g, "");
    const n = Number.parseFloat(normalized);
    return Number.isFinite(n) ? n : NaN;
  }
  return NaN;
}

/**
 * Count decimal places in a finite number, handling scientific notation.
 * @param {number} num
 * @returns {number}
 */
function countDecimalPlaces(num) {
  if (!Number.isFinite(num)) return 0;
  const s = num.toString().toLowerCase();
  if (s.includes("e-")) {
    const [base, expPart] = s.split("e-");
    const exp = Number.parseInt(expPart, 10) || 0;
    const fractional = (base.split(".")[1] || "").length;
    return exp + fractional;
  }
  const parts = s.split(".");
  return parts.length > 1 ? parts[1].length : 0;
}

/** Public API */

/**
 * PUBLIC_INTERFACE
 * validateNumber
 * Validate a numeric input with common constraints.
 *
 * @param {any} value - Input value (string/number)
 * @param {{
 *   field?: string,
 *   required?: boolean,
 *   integerOnly?: boolean,
 *   min?: number,
 *   max?: number,
 *   maxDecimalPlaces?: number
 * }} [opts]
 * @returns {{ valid: boolean, value: number|null, errors: Array<{code:string,message:string,field?:string}> }}
 */
export function validateNumber(value, opts = {}) {
  const field = String(opts.field || "Value");
  const required = opts.required === true;
  const integerOnly = opts.integerOnly === true;
  const min = typeof opts.min === "number" ? opts.min : undefined;
  const max = typeof opts.max === "number" ? opts.max : undefined;
  const maxDecimalPlaces =
    typeof opts.maxDecimalPlaces === "number" ? Math.max(0, Math.floor(opts.maxDecimalPlaces)) : DECIMALS.MAX_DEFAULT;

  /** @type {Array<any>} */
  const errors = [];

  if (required && isBlank(value)) {
    errors.push(createValidationError(ERROR_CODES.VAL_REQUIRED, { field }));
    return { valid: false, value: null, errors };
  }

  // Optional empty input is valid with null value
  if (!required && isBlank(value)) {
    return { valid: true, value: null, errors };
  }

  const num = toNumber(value);
  if (!Number.isFinite(num)) {
    errors.push(createValidationError(ERROR_CODES.VAL_NOT_NUMBER, { field }));
    return { valid: false, value: null, errors };
  }

  if (integerOnly && !Number.isInteger(num)) {
    errors.push(createValidationError(ERROR_CODES.VAL_NOT_INTEGER, { field }));
  }

  const decimals = countDecimalPlaces(num);
  if (decimals > maxDecimalPlaces) {
    errors.push(
      createValidationError(ERROR_CODES.VAL_DECIMALS_EXCEEDED, { field, maxDecimals: maxDecimalPlaces })
    );
  }

  if (typeof min === "number" && num < min) {
    errors.push(createValidationError(ERROR_CODES.VAL_OUT_OF_RANGE, { field, min, max: max ?? "∞" }));
  }
  if (typeof max === "number" && num > max) {
    errors.push(createValidationError(ERROR_CODES.VAL_OUT_OF_RANGE, { field, min: min ?? "-∞", max }));
  }

  return { valid: errors.length === 0, value: num, errors };
}

/**
 * PUBLIC_INTERFACE
 * validateArithmetic
 * Validate arithmetic operation inputs and cross-field rules.
 * Also returns a computed result when valid to support caller flows.
 *
 * @param {{ a:any, b:any, op: "add"|"sub"|"mul"|"div" }} input
 * @param {{ maxDecimalPlaces?: number, aLabel?: string, bLabel?: string }} [opts]
 * @returns {{ valid: boolean, a: number|null, b: number|null, op: string, errors: Array<object>, result?: number }}
 */
export function validateArithmetic(input, opts = {}) {
  const aRes = validateNumber(input?.a, {
    field: opts.aLabel || "A",
    required: true,
    maxDecimalPlaces: opts.maxDecimalPlaces ?? DECIMALS.MAX_DEFAULT,
  });
  const bRes = validateNumber(input?.b, {
    field: opts.bLabel || "B",
    required: true,
    maxDecimalPlaces: opts.maxDecimalPlaces ?? DECIMALS.MAX_DEFAULT,
  });

  const errors = [...aRes.errors, ...bRes.errors];

  const op = String(input?.op || "").toLowerCase();
  const allowed = [ARITHMETIC_OPS.ADD, ARITHMETIC_OPS.SUB, ARITHMETIC_OPS.MUL, ARITHMETIC_OPS.DIV];
  if (!allowed.includes(op)) {
    errors.push(createValidationError(ERROR_CODES.SYS_UNKNOWN, { field: "Operation" }));
    return { valid: false, a: aRes.value, b: bRes.value, op, errors };
  }

  // Cross-field rule: division by zero prevention
  if (op === ARITHMETIC_OPS.DIV && aRes.valid && bRes.valid && bRes.value === 0) {
    errors.push(createValidationError(ERROR_CODES.VAL_DIVIDE_BY_ZERO, { field: "B" }));
    return { valid: false, a: aRes.value, b: bRes.value, op, errors };
  }

  if (errors.length > 0 || !aRes.valid || !bRes.valid) {
    return { valid: false, a: aRes.value, b: bRes.value, op, errors };
  }

  // Compute result to assist downstream flows (pure client convenience)
  let result;
  switch (op) {
    case ARITHMETIC_OPS.ADD:
      result = (aRes.value ?? 0) + (bRes.value ?? 0);
      break;
    case ARITHMETIC_OPS.SUB:
      result = (aRes.value ?? 0) - (bRes.value ?? 0);
      break;
    case ARITHMETIC_OPS.MUL:
      result = (aRes.value ?? 0) * (bRes.value ?? 0);
      break;
    case ARITHMETIC_OPS.DIV:
      result = (aRes.value ?? 0) / (bRes.value ?? 1);
      break;
    default:
      // should never reach here due to earlier checks
      result = undefined;
  }

  return { valid: true, a: aRes.value, b: bRes.value, op, errors, result };
}

/**
 * PUBLIC_INTERFACE
 * validateTemperatureInput
 * Validate a temperature input for absolute zero constraints.
 *
 * @param {any} value - temperature numeric value
 * @param {"C"|"F"|"K"|string} unit - unit
 * @param {{ field?: string, maxDecimalPlaces?: number }} [opts]
 * @returns {{ valid: boolean, value: number|null, unit: string, errors: Array<object> }}
 */
export function validateTemperatureInput(value, unit, opts = {}) {
  const unitKey = String(unit || "").toUpperCase();
  const field = String(opts.field || "Temperature");

  // First validate numeric nature and decimal places
  const numRes = validateNumber(value, {
    field,
    required: true,
    maxDecimalPlaces: opts.maxDecimalPlaces ?? DECIMALS.MAX_DEFAULT,
  });

  /** @type {Array<object>} */
  const errors = [...numRes.errors];

  // Unit compatibility check
  if (!(unitKey === TEMPERATURE_UNITS.C || unitKey === TEMPERATURE_UNITS.F || unitKey === TEMPERATURE_UNITS.K)) {
    errors.push(
      createValidationError(ERROR_CODES.VAL_TEMP_CONVERSION_INCOMPATIBLE_UNIT, {
        field,
        fromUnit: unitKey || "unknown",
        toUnit: "N/A",
      })
    );
    return { valid: false, value: numRes.value, unit: unitKey, errors };
  }

  if (numRes.valid && numRes.value != null) {
    const absZero = ABSOLUTE_ZERO[unitKey];
    if (typeof absZero === "number" && numRes.value < absZero) {
      errors.push(createValidationError(ERROR_CODES.VAL_TEMP_BELOW_ABSOLUTE_ZERO, { field, unit: unitKey }));
    }
  }

  return { valid: errors.length === 0 && numRes.valid, value: numRes.value, unit: unitKey, errors };
}

/**
 * PUBLIC_INTERFACE
 * validateTemperatureConversion
 * Validate a temperature conversion request for unit compatibility and bounds.
 *
 * @param {{ value: any, fromUnit: "C"|"F"|"K"|string, toUnit: "C"|"F"|"K"|string }} req
 * @returns {{ valid: boolean, value: number|null, fromUnit: string, toUnit: string, errors: Array<object> }}
 */
export function validateTemperatureConversion(req) {
  const fromKey = String(req?.fromUnit || "").toUpperCase();
  const toKey = String(req?.toUnit || "").toUpperCase();

  const out = validateTemperatureInput(req?.value, fromKey, { field: "Temperature" });

  /** @type {Array<object>} */
  const errors = [...out.errors];

  const allowed = [TEMPERATURE_UNITS.C, TEMPERATURE_UNITS.F, TEMPERATURE_UNITS.K];
  const fromOk = allowed.includes(fromKey);
  const toOk = allowed.includes(toKey);

  if (!fromOk || !toOk) {
    errors.push(
      createValidationError(ERROR_CODES.VAL_TEMP_CONVERSION_INCOMPATIBLE_UNIT, {
        field: "Unit",
        fromUnit: fromKey || "unknown",
        toUnit: toKey || "unknown",
      })
    );
    return { valid: false, value: out.value, fromUnit: fromKey, toUnit: toKey, errors };
  }

  return { valid: errors.length === 0 && out.valid, value: out.value, fromUnit: fromKey, toUnit: toKey, errors };
}

/**
 * PUBLIC_INTERFACE
 * isValidTemperatureUnit
 * Check if unit is one of supported temperature units.
 *
 * @param {string} unit
 * @returns {boolean}
 */
export function isValidTemperatureUnit(unit) {
  const u = String(unit || "").toUpperCase();
  return u === TEMPERATURE_UNITS.C || u === TEMPERATURE_UNITS.F || u === TEMPERATURE_UNITS.K;
}

/**
 * PUBLIC_INTERFACE
 * ValidationService (namespaced export)
 * Organized export for consumers who prefer an object.
 */
export const ValidationService = Object.freeze({
  validateNumber,
  validateArithmetic,
  validateTemperatureInput,
  validateTemperatureConversion,
  isValidTemperatureUnit,
});
