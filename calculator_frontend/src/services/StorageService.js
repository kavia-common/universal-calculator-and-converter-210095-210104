/* ============================================================================
   REQUIREMENT TRACEABILITY
   ============================================================================
   Requirement ID: REQ-AUDIT-STORAGE-001
   User Story: As a developer, I need a reliable storage utility that safely
               persists audit trail data with a fallback when storage is not
               available (e.g., private mode or SSR).
   Acceptance Criteria:
     - JSON parse/stringify safety wrappers
     - Detect and use localStorage when available
     - In-memory fallback when localStorage is unavailable
     - Clear, documented public API functions
   GxP Impact: YES - Ensures audit data endurance and recoverability (ALCOA+).
   Risk Level: LOW
   Validation Protocol: N/A
   ============================================================================ */
/* ============================================================================
   IMPORTS AND DEPENDENCIES
   ============================================================================
   None - standalone utility (no external deps)
   ============================================================================ */

/**
 * Safe JSON parse that returns a fallback on error.
 * @param {string|null} value
 * @param {any} fallback
 * @returns {any}
 */
function safeParse(value, fallback) {
  if (value == null) return fallback;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

/**
 * Safe JSON stringify that returns undefined on error.
 * @param {any} value
 * @returns {string|undefined}
 */
function safeStringify(value) {
  try {
    return JSON.stringify(value);
  } catch {
    return undefined;
  }
}

/**
 * Determine if localStorage is available and writable.
 * @returns {Storage|null}
 */
function getLocalStorageOrNull() {
  try {
    if (typeof window === "undefined") return null;
    const ls = window.localStorage;
    if (!ls) return null;
    const probeKey = "__storage_probe__";
    ls.setItem(probeKey, "1");
    ls.removeItem(probeKey);
    return ls;
  } catch {
    return null;
  }
}

// In-memory fallback store (not persistent across reloads)
const memoryStore = new Map();

/**
 * Read a raw string value from the storage.
 * @param {string} key
 * @returns {string|null}
 */
function readRaw(key) {
  const ls = getLocalStorageOrNull();
  if (ls) {
    try {
      return ls.getItem(key);
    } catch {
      // ignore and fallback
    }
  }
  return memoryStore.has(key) ? memoryStore.get(key) : null;
}

/**
 * Write a raw string value into storage.
 * @param {string} key
 * @param {string} value
 * @returns {boolean}
 */
function writeRaw(key, value) {
  const ls = getLocalStorageOrNull();
  if (ls) {
    try {
      ls.setItem(key, value);
      return true;
    } catch {
      // ignore and fallback
    }
  }
  memoryStore.set(key, value);
  return true;
}

/**
 * Remove a key from storage.
 * @param {string} key
 * @returns {boolean}
 */
function removeKey(key) {
  const ls = getLocalStorageOrNull();
  if (ls) {
    try {
      ls.removeItem(key);
      // also remove from memory to keep in sync if it existed
      memoryStore.delete(key);
      return true;
    } catch {
      // ignore and fallback
    }
  }
  memoryStore.delete(key);
  return true;
}

// PUBLIC_INTERFACE
export function getJSON(key, fallback) {
  /** Read a JSON value from storage, returning fallback when missing or invalid.
   *
   * GxP Critical: Yes - Ensures data availability and enduring storage of audit trail.
   *
   * Parameters:
   * - key: string (required) - storage key
   * - fallback: any - default value when missing or parse fails
   *
   * Returns:
   * - any - parsed JSON or fallback
   *
   * Throws:
   * - None
   *
   * Audit:
   * - None (pure storage utility)
   */
  const raw = readRaw(key);
  return safeParse(raw, fallback);
}

// PUBLIC_INTERFACE
export function setJSON(key, value) {
  /** Store a value as JSON in storage.
   *
   * GxP Critical: Yes - Supports audit data endurance and accuracy.
   *
   * Parameters:
   * - key: string (required) - storage key
   * - value: any - value to serialize
   *
   * Returns:
   * - boolean: true on success
   *
   * Throws:
   * - None
   */
  const str = safeStringify(value);
  if (str === undefined) return false;
  return writeRaw(key, str);
}

// PUBLIC_INTERFACE
export function remove(key) {
  /** Remove an item from storage.
   *
   * GxP Critical: Yes - Used by administrative functions to clear audit logs (with e-signature).
   *
   * Parameters:
   * - key: string (required)
   *
   * Returns:
   * - boolean: true on success
   *
   * Throws:
   * - None
   */
  return removeKey(key);
}

// PUBLIC_INTERFACE
export function getRaw(key) {
  /** Read a raw string value from storage.
   *
   * GxP Critical: No - Helper, typically not used directly for audit.
   *
   * Parameters:
   * - key: string
   *
   * Returns:
   * - string|null
   */
  return readRaw(key);
}

// PUBLIC_INTERFACE
export function setRaw(key, value) {
  /** Write a raw string value to storage (no JSON handling).
   *
   * GxP Critical: No - Helper, avoid for audit records to ensure structure.
   *
   * Parameters:
   * - key: string
   * - value: string
   *
   * Returns:
   * - boolean
   */
  return writeRaw(key, value);
}
