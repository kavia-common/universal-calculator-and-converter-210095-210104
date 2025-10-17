/* ============================================================================
   REQUIREMENT TRACEABILITY
   ============================================================================
   Requirement ID: REQ-CONVERSION-SERVICE-001
   User Story: As a user, I want to convert between common units (length, mass,
               temperature, volume, time) with validated inputs and clear errors.
   Acceptance Criteria:
     - Support length (m, cm, mm, in, ft)
     - Support mass (kg, g, lb, oz)
     - Support temperature (C, F, K)
     - Support volume (L, mL, gal)
     - Support time (ms, s, min, h)
     - Validate inputs and enforce reasonable ranges
     - Return structured results and error details
   GxP Impact: YES - Validations and audit-triggered conversions must be accurate.
   Risk Level: MEDIUM
   Validation Protocol: VP-CONVERSION-SERVICE-001
   ============================================================================ */
/* ============================================================================
   IMPORTS AND DEPENDENCIES
   ============================================================================ */

import { ValidationService } from "./ValidationService";
import { DECIMALS } from "../utils/constants";
import { createValidationError } from "../utils/errorUtils";

/** --------------------------------------------------------------------------
 * Unit catalog and base conversion factors
 * - For multiplicative units, conversions use "base unit factors". For example,
 *   length base is meter (m). factorToBase[cm] = 0.01. Convert via:
 *     valueInBase = value * factorToBase[from]
 *     converted   = valueInBase / factorToBase[to]
 * - Temperature uses explicit formulas, not multiplicative factors.
 * -------------------------------------------------------------------------- */

/** Categories constant to help UI options and validation */
const CATEGORIES = Object.freeze({
  LENGTH: "length",
  MASS: "mass",
  TEMPERATURE: "temperature",
  VOLUME: "volume",
  TIME: "time",
});

/** Length: base = meter */
const LENGTH_UNITS = Object.freeze(["m", "cm", "mm", "in", "ft"]);
const LENGTH_TO_M = Object.freeze({
  m: 1,
  cm: 0.01,
  mm: 0.001,
  in: 0.0254,
  ft: 0.3048,
});

/** Mass: base = kilogram */
const MASS_UNITS = Object.freeze(["kg", "g", "lb", "oz"]);
const MASS_TO_KG = Object.freeze({
  kg: 1,
  g: 0.001,
  lb: 0.45359237, // exact definition
  oz: 0.028349523125, // exact definition
});

/** Volume: base = liter */
const VOLUME_UNITS = Object.freeze(["L", "mL", "gal"]);
const VOLUME_TO_L = Object.freeze({
  L: 1,
  mL: 0.001,
  gal: 3.78541, // US gallon in liters
});

/** Time: base = second */
const TIME_UNITS = Object.freeze(["ms", "s", "min", "h"]);
const TIME_TO_S = Object.freeze({
  ms: 0.001,
  s: 1,
  min: 60,
  h: 3600,
});

/** Temperature units (special handling) */
const TEMP_UNITS = Object.freeze(["C", "F", "K"]);

/** Friendly labels (used by UI layer via getUnitsForCategory) */
const UNIT_LABELS = Object.freeze({
  // length
  m: "m (meter)",
  cm: "cm (centimeter)",
  mm: "mm (millimeter)",
  in: "in (inch)",
  ft: "ft (foot)",
  // mass
  kg: "kg (kilogram)",
  g: "g (gram)",
  lb: "lb (pound)",
  oz: "oz (ounce)",
  // volume
  L: "L (liter)",
  mL: "mL (milliliter)",
  gal: "gal (US gallon)",
  // time
  ms: "ms (millisecond)",
  s: "s (second)",
  min: "min (minute)",
  h: "h (hour)",
  // temperature
  C: "°C (Celsius)",
  F: "°F (Fahrenheit)",
  K: "K (Kelvin)",
});

/** Reasonable numeric range guards for non-temperature categories (0..1e12) */
const RANGE_GUARDS = Object.freeze({
  [CATEGORIES.LENGTH]: { min: 0, max: 1e12 },
  [CATEGORIES.MASS]: { min: 0, max: 1e12 },
  [CATEGORIES.VOLUME]: { min: 0, max: 1e12 },
  [CATEGORIES.TIME]: { min: 0, max: 1e12 },
});

/** --------------------------------------------------------------------------
 * Internal helpers
 * -------------------------------------------------------------------------- */

/**
 * Normalize category to known key.
 * @param {string} cat
 * @returns {"length"|"mass"|"temperature"|"volume"|"time"|null}
 */
function normalizeCategory(cat) {
  const c = String(cat || "").toLowerCase();
  switch (c) {
    case "length":
      return CATEGORIES.LENGTH;
    case "mass":
      return CATEGORIES.MASS;
    case "temperature":
      return CATEGORIES.TEMPERATURE;
    case "volume":
      return CATEGORIES.VOLUME;
    case "time":
      return CATEGORIES.TIME;
    default:
      return null;
  }
}

/**
 * Convert via multiplicative factors to a base unit and then to target.
 * @param {number} value - numeric input (>= 0) for non-temp categories
 * @param {Record<string, number>} factorToBase - map of unit -> factor to base
 * @param {string} fromUnit
 * @param {string} toUnit
 * @returns {number}
 */
function convertViaFactor(value, factorToBase, fromUnit, toUnit) {
  const inBase = value * factorToBase[fromUnit];
  return inBase / factorToBase[toUnit];
}

/**
 * Temperature conversions (C, F, K)
 * @param {number} value
 * @param {"C"|"F"|"K"} from
 * @param {"C"|"F"|"K"} to
 * @returns {number}
 */
function convertTemperature(value, from, to) {
  const f = String(from).toUpperCase();
  const t = String(to).toUpperCase();

  if (f === t) return value;

  let celsius;
  switch (f) {
    case "C":
      celsius = value;
      break;
    case "F":
      celsius = (value - 32) * (5 / 9);
      break;
    case "K":
      celsius = value - 273.15;
      break;
    default:
      return NaN;
  }

  switch (t) {
    case "C":
      return celsius;
    case "F":
      return celsius * (9 / 5) + 32;
    case "K":
      return celsius + 273.15;
    default:
      return NaN;
  }
}

/** --------------------------------------------------------------------------
 * Public API
 * -------------------------------------------------------------------------- */

/**
 * PUBLIC_INTERFACE
 * getUnitsForCategory
 * Return supported units and labels for a given category.
 *
 * @param {"length"|"mass"|"temperature"|"volume"|"time"|string} category
 * @returns {Array<{ value: string, label: string }>} options for UI selects
 */
export function getUnitsForCategory(category) {
  const cat = normalizeCategory(category);
  if (!cat) return [];
  switch (cat) {
    case CATEGORIES.LENGTH:
      return LENGTH_UNITS.map((u) => ({ value: u, label: UNIT_LABELS[u] || u }));
    case CATEGORIES.MASS:
      return MASS_UNITS.map((u) => ({ value: u, label: UNIT_LABELS[u] || u }));
    case CATEGORIES.VOLUME:
      return VOLUME_UNITS.map((u) => ({ value: u, label: UNIT_LABELS[u] || u }));
    case CATEGORIES.TIME:
      return TIME_UNITS.map((u) => ({ value: u, label: UNIT_LABELS[u] || u }));
    case CATEGORIES.TEMPERATURE:
      return TEMP_UNITS.map((u) => ({ value: u, label: UNIT_LABELS[u] || u }));
    default:
      return [];
  }
}

/**
 * PUBLIC_INTERFACE
 * getDefaultUnitsForCategory
 * Return sensible default from/to units for a category.
 *
 * @param {"length"|"mass"|"temperature"|"volume"|"time"|string} category
 * @returns {{ from: string, to: string }|null}
 */
export function getDefaultUnitsForCategory(category) {
  const cat = normalizeCategory(category);
  switch (cat) {
    case CATEGORIES.LENGTH:
      return { from: "m", to: "cm" };
    case CATEGORIES.MASS:
      return { from: "kg", to: "g" };
    case CATEGORIES.VOLUME:
      return { from: "L", to: "mL" };
    case CATEGORIES.TIME:
      return { from: "s", to: "min" };
    case CATEGORIES.TEMPERATURE:
      return { from: "C", to: "F" };
    default:
      return null;
  }
}

/**
 * PUBLIC_INTERFACE
 * convert
 * Convert a value between units for the given category.
 *
 * GxP Critical: Yes - Validated conversions used in audit-logged user actions.
 *
 * Parameters:
 * - req: {
 *     category: "length"|"mass"|"temperature"|"volume"|"time",
 *     value: any,
 *     fromUnit: string,
 *     toUnit: string
 *   }
 *
 * Returns:
 * - { ok: true, value: number, category: string, fromUnit: string, toUnit: string, input: number, meta?: object }
 *   OR
 * - { ok: false, error: {code:string,message:string}, category: string, fromUnit: string, toUnit: string }
 *
 * Throws:
 * - None (returns structured error instead)
 *
 * Audit:
 * - Caller must record before/after and units via AuditService through UI.
 */
export function convert(req) {
  const category = normalizeCategory(req?.category);
  const fromUnit = String(req?.fromUnit || "").trim();
  const toUnit = String(req?.toUnit || "").trim();

  if (!category) {
    return {
      ok: false,
      error: createValidationError("SYS_UNKNOWN", { field: "Category" }),
      category: String(req?.category || ""),
      fromUnit,
      toUnit,
    };
  }

  if (category === CATEGORIES.TEMPERATURE) {
    // Validate temperature with absolute zero and unit compatibility
    const v = ValidationService.validateTemperatureConversion({
      value: req?.value,
      fromUnit,
      toUnit,
    });
    if (!v.valid) {
      const first = v.errors?.[0] || createValidationError("SYS_UNKNOWN", { field: "Temperature" });
      return {
        ok: false,
        error: first,
        category,
        fromUnit,
        toUnit,
      };
    }
    const inputNum = v.value;
    const result = convertTemperature(inputNum, v.fromUnit, v.toUnit);
    return {
      ok: true,
      value: result,
      input: inputNum,
      category,
      fromUnit: v.fromUnit,
      toUnit: v.toUnit,
      meta: { method: "temperature-formula" },
    };
  }

  // Non-temperature categories (multiplicative factors and non-negative ranges)
  const guards = RANGE_GUARDS[category] || { min: undefined, max: undefined };
  const val = ValidationService.validateNumber(req?.value, {
    field: "Value",
    required: true,
    maxDecimalPlaces: DECIMALS.MAX_DEFAULT,
    min: guards.min,
    max: guards.max,
  });
  if (!val.valid) {
    return {
      ok: false,
      error: val.errors?.[0] || createValidationError("SYS_UNKNOWN", { field: "Value" }),
      category,
      fromUnit,
      toUnit,
    };
  }

  const numeric = val.value;

  // Determine unit sets and factor maps
  let unitSet = [];
  let factorMap = {};
  let baseName = "";
  switch (category) {
    case CATEGORIES.LENGTH:
      unitSet = LENGTH_UNITS;
      factorMap = LENGTH_TO_M;
      baseName = "m";
      break;
    case CATEGORIES.MASS:
      unitSet = MASS_UNITS;
      factorMap = MASS_TO_KG;
      baseName = "kg";
      break;
    case CATEGORIES.VOLUME:
      unitSet = VOLUME_UNITS;
      factorMap = VOLUME_TO_L;
      baseName = "L";
      break;
    case CATEGORIES.TIME:
      unitSet = TIME_UNITS;
      factorMap = TIME_TO_S;
      baseName = "s";
      break;
    default:
      unitSet = [];
  }

  if (!unitSet.includes(fromUnit) || !unitSet.includes(toUnit)) {
    return {
      ok: false,
      error: createValidationError("SYS_UNKNOWN", { field: "Unit" }),
      category,
      fromUnit,
      toUnit,
    };
  }

  const converted = convertViaFactor(numeric, factorMap, fromUnit, toUnit);
  return {
    ok: true,
    value: converted,
    input: numeric,
    category,
    fromUnit,
    toUnit,
    meta: { base: baseName, method: "factor" },
  };
}

/**
 * PUBLIC_INTERFACE
 * ConversionService (namespaced export)
 * Organized object export for consumers preferring an object.
 */
export const ConversionService = Object.freeze({
  CATEGORIES,
  getUnitsForCategory,
  getDefaultUnitsForCategory,
  convert,
});
