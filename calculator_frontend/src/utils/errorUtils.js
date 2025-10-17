/* ============================================================================
   REQUIREMENT TRACEABILITY
   ============================================================================
   Requirement ID: REQ-UTILS-ERRORS-001
   User Story: As a user, I want clear error messages; as a developer, I want
               consistent error objects across services and UI components.
   Acceptance Criteria:
     - Centralized mapping from error codes to user-friendly messages
     - Helper to create standardized validation errors
     - Helper to extract/display messages
   GxP Impact: YES - Clear error messaging improves compliance and usability.
   Risk Level: LOW
   Validation Protocol: N/A
   ============================================================================ */

import { ERROR_CODES } from "./constants";

/**
 * Default message templates for error codes.
 * Placeholders (e.g., {field}, {min}, {max}) will be replaced from params.
 */
const ERROR_MESSAGES = {
  [ERROR_CODES.VAL_REQUIRED]: "{field} is required.",
  [ERROR_CODES.VAL_NOT_NUMBER]: "{field} must be a valid number.",
  [ERROR_CODES.VAL_NOT_INTEGER]: "{field} must be an integer.",
  [ERROR_CODES.VAL_DECIMALS_EXCEEDED]: "{field} must have no more than {maxDecimals} decimal places.",
  [ERROR_CODES.VAL_OUT_OF_RANGE]: "{field} must be between {min} and {max}.",
  [ERROR_CODES.VAL_DIVIDE_BY_ZERO]: "Cannot divide by zero.",
  [ERROR_CODES.VAL_TEMP_BELOW_ABSOLUTE_ZERO]: "{field} is below absolute zero for {unit}.",
  [ERROR_CODES.VAL_TEMP_CONVERSION_INCOMPATIBLE_UNIT]: "Incompatible temperature units: cannot convert from {fromUnit} to {toUnit}.",
  [ERROR_CODES.SYS_UNKNOWN]: "An unexpected error occurred.",
};

/**
 * Replace message template placeholders with parameter values.
 * @param {string} template
 * @param {Record<string, any>} params
 * @returns {string}
 */
function fillTemplate(template, params = {}) {
  if (!template) return "";
  return template.replace(/\{(\w+)\}/g, (_, key) => String(params[key] ?? ""));
}

// PUBLIC_INTERFACE
export function getErrorMessage(code, params = {}) {
  /** Return a user-friendly message for a given error code.
   *
   * Parameters:
   * - code: string - one of ERROR_CODES
   * - params?: Record<string, any> - values to interpolate into the template
   *
   * Returns:
   * - string
   */
  const template = ERROR_MESSAGES[code] || ERROR_MESSAGES[ERROR_CODES.SYS_UNKNOWN];
  return fillTemplate(template, params);
}

// PUBLIC_INTERFACE
export function createValidationError(code, params = {}, options = {}) {
  /** Create a standardized validation error object.
   *
   * Parameters:
   * - code: string - error code from ERROR_CODES
   * - params?: Record<string, any> - parameters for message interpolation
   * - options?: { field?: string, severity?: "error"|"warning" }
   *
   * Returns:
   * - { code: string, message: string, field?: string, params?: object, severity: string }
   */
  const field = options.field || params.field || "Input";
  const message = getErrorMessage(code, { field, ...params });
  return {
    code,
    message,
    field,
    params,
    severity: options.severity || "error",
  };
}

// PUBLIC_INTERFACE
export function isValidationError(obj) {
  /** Determine if an object resembles a standardized validation error.
   *
   * Parameters:
   * - obj: any
   * Returns:
   * - boolean
   */
  return !!obj && typeof obj === "object" && typeof obj.code === "string" && typeof obj.message === "string";
}

// PUBLIC_INTERFACE
export function toUserMessage(errorLike) {
  /** Convert an unknown error-like input to a displayable user message.
   *
   * Parameters:
   * - errorLike: any
   * Returns:
   * - string
   */
  if (isValidationError(errorLike)) return errorLike.message;
  if (errorLike instanceof Error) return errorLike.message || ERROR_MESSAGES[ERROR_CODES.SYS_UNKNOWN];
  if (typeof errorLike === "string") return errorLike;
  try {
    return JSON.stringify(errorLike);
  } catch {
    return ERROR_MESSAGES[ERROR_CODES.SYS_UNKNOWN];
  }
}
