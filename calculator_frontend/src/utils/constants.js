/* ============================================================================
   REQUIREMENT TRACEABILITY
   ============================================================================
   Requirement ID: REQ-UTILS-CONSTANTS-001
   User Story: As a developer, I want centralized constants for roles, error codes,
               theme values, app metadata, and unit definitions to ensure consistency.
   Acceptance Criteria:
     - Export role constants consistent with AccessControl
     - Define error code constants used across validation and error handling
     - Provide app metadata (name, version) sourced from config
     - Provide temperature unit constants and absolute zero boundaries
     - Provide theme colors for JS usage
   GxP Impact: YES - Constants drive validation/error logic used in compliance features.
   Risk Level: LOW
   Validation Protocol: N/A
   ============================================================================ */

import { getAppConfig } from "../config/appConfig";
import { ROLES as ACCESS_ROLES } from "../services/AccessControl";

/**
 * App metadata constants for display and audit context.
 */
export const APP_METADATA = Object.freeze({
  name: "Universal Calculator & Converter",
  version: getAppConfig().APP_VERSION,
});

/**
 * Role constants (re-exported from AccessControl to keep a single source of truth).
 */
export const ROLES = ACCESS_ROLES;

/**
 * Error code constants used throughout validation and error handling.
 */
export const ERROR_CODES = Object.freeze({
  VAL_REQUIRED: "VAL_REQUIRED",
  VAL_NOT_NUMBER: "VAL_NOT_NUMBER",
  VAL_NOT_INTEGER: "VAL_NOT_INTEGER",
  VAL_DECIMALS_EXCEEDED: "VAL_DECIMALS_EXCEEDED",
  VAL_OUT_OF_RANGE: "VAL_OUT_OF_RANGE",
  VAL_DIVIDE_BY_ZERO: "VAL_DIVIDE_BY_ZERO",
  VAL_TEMP_BELOW_ABSOLUTE_ZERO: "VAL_TEMP_BELOW_ABSOLUTE_ZERO",
  VAL_TEMP_CONVERSION_INCOMPATIBLE_UNIT: "VAL_TEMP_CONVERSION_INCOMPATIBLE_UNIT",
  SYS_UNKNOWN: "SYS_UNKNOWN",
});

/**
 * Temperature unit constants and absolute zero thresholds.
 */
export const TEMPERATURE_UNITS = Object.freeze({
  C: "C",
  F: "F",
  K: "K",
});

export const ABSOLUTE_ZERO = Object.freeze({
  C: -273.15, // °C
  F: -459.67, // °F
  K: 0,       // K
});

/**
 * Default decimal precision constraints (can be overridden per validation)
 */
export const DECIMALS = Object.freeze({
  MAX_DEFAULT: 8,
});

/**
 * Arithmetic operation identifiers
 */
export const ARITHMETIC_OPS = Object.freeze({
  ADD: "add",
  SUB: "sub",
  MUL: "mul",
  DIV: "div",
});

/**
 * Theme colors for any JS-side dynamic needs (mirrors index.css variables).
 */
export const THEME_COLORS = Object.freeze({
  background: "#f9fafb",
  surface: "#ffffff",
  text: "#111827",
  muted: "#6b7280",
  primary: "#2563EB",
  secondary: "#F59E0B",
  error: "#EF4444",
  border: "#e5e7eb",
});

/**
 * Utility: known unit label mapping (temperature)
 */
export const TEMPERATURE_UNIT_LABELS = Object.freeze({
  C: "°C",
  F: "°F",
  K: "K",
});
