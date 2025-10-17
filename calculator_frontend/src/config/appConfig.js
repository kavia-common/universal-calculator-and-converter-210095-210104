// ============================================================================
// REQUIREMENT TRACEABILITY
// ============================================================================
// Requirement ID: REQ-CONFIG-001
// User Story: As a platform owner, I need runtime-configurable app settings with safe defaults.
// Acceptance Criteria:
// - Export APP_VERSION, AUDIT_API_URL (nullable), AUDIT_BATCH_SIZE
// - Allow overrides via window.__APP_CONFIG__ when present
// - Provide a public function to obtain the merged config
// GxP Impact: YES - Configuration impacts audit features. Read-only in UI, no data modification.
// Risk Level: LOW
// Validation Protocol: N/A
// ============================================================================

/**
 * Ocean Professional - App Configuration
 * Defaults can be overridden at runtime by setting a global window.__APP_CONFIG__ object.
 * For example:
 *   window.__APP_CONFIG__ = { AUDIT_API_URL: "https://audit.example.com/track", AUDIT_BATCH_SIZE: 50 };
 */

const DEFAULT_APP_CONFIG = Object.freeze({
  APP_VERSION: "0.1.0",
  AUDIT_API_URL: null,
  AUDIT_BATCH_SIZE: 20,
});

// Compute runtime overrides once on module load
let runtimeOverrides = {};
try {
  // eslint-disable-next-line no-undef
  if (typeof window !== "undefined" && window.__APP_CONFIG__) {
    // eslint-disable-next-line no-undef
    runtimeOverrides = { ...window.__APP_CONFIG__ };
  }
} catch {
  runtimeOverrides = {};
}

const MERGED_APP_CONFIG = Object.freeze({
  ...DEFAULT_APP_CONFIG,
  ...runtimeOverrides,
});

/**
 * PUBLIC_INTERFACE
 * getAppConfig
 * Returns a read-only merged configuration object with runtime overrides applied.
 *
 * @returns {{APP_VERSION:string, AUDIT_API_URL:string|null, AUDIT_BATCH_SIZE:number}}
 */
export function getAppConfig() {
  return MERGED_APP_CONFIG;
}

/**
 * PUBLIC_INTERFACE
 * getConfigValue
 * Return a single configuration value by key. This is a convenience helper.
 *
 * @param {keyof typeof MERGED_APP_CONFIG} key - Config key to read
 * @returns {any} - Value associated with the key
 */
export function getConfigValue(key) {
  return MERGED_APP_CONFIG[key];
}
