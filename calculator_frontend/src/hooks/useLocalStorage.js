// ============================================================================
// REQUIREMENT TRACEABILITY
// ============================================================================
// Requirement ID: REQ-AUTH-STATE-001
// User Story: As a user, I want my session to persist across refreshes so that
//             I don't have to sign in again each time.
// Acceptance Criteria:
// - Implement a localStorage-backed React hook
// - Safe JSON serialization/parsing with error handling
// - SSR and private mode friendly (no crashes if storage unavailable)
// GxP Impact: YES - Session persistence affects access and audit attribution.
// Risk Level: LOW
// Validation Protocol: N/A
// ============================================================================
//
// IMPORTS AND DEPENDENCIES
// ============================================================================

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Safe JSON parse that returns fallback on failure.
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
 * Safe JSON stringify that returns undefined on failure.
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
 * Get localStorage if available (guard for SSR/private browsing).
 */
function getStorage() {
  try {
    if (typeof window !== "undefined" && window.localStorage) {
      return window.localStorage;
    }
  } catch {
    // ignore
  }
  return null;
}

// PUBLIC_INTERFACE
export function useLocalStorage(key, initialValue) {
  /** React hook to persist a value in localStorage with robust error-handling.
   *
   * GxP Critical: Yes - Used to persist authentication session state.
   *
   * Parameters:
   * - key: string (required)
   * - initialValue: any (used when nothing stored or parse fails)
   *
   * Returns:
   * - [value, setValue, clearValue]
   *   value: any - current state value
   *   setValue: (updater: any | (prev:any)=>any) => void
   *   clearValue: () => void
   *
   * Throws:
   * - None
   * Audit:
   * - None (state-only). Authentication actions should be logged at call sites.
   */
  const storageRef = useRef(getStorage());
  const [state, setState] = useState(() => {
    const storage = storageRef.current;
    if (!storage) return initialValue;
    const raw = storage.getItem(key);
    return raw == null ? initialValue : safeParse(raw, initialValue);
  });

  useEffect(() => {
    storageRef.current = getStorage();
  }, []);

  const setValue = useCallback(
    (updater) => {
      setState((prev) => {
        const next =
          typeof updater === "function" ? updater(prev) : updater;
        const storage = storageRef.current;
        if (storage) {
          if (next === undefined || next === null) {
            try {
              storage.removeItem(key);
            } catch {
              // ignore storage errors
            }
          } else {
            const str = safeStringify(next);
            if (str !== undefined) {
              try {
                storage.setItem(key, str);
              } catch {
                // ignore storage errors
              }
            }
          }
        }
        return next;
      });
    },
    [key]
  );

  const clearValue = useCallback(() => {
    const storage = storageRef.current;
    try {
      storage?.removeItem(key);
    } catch {
      // ignore
    }
    setState(initialValue);
  }, [initialValue, key]);

  return [state, setValue, clearValue];
}
