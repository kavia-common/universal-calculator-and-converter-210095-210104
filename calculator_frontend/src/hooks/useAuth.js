// ============================================================================
// REQUIREMENT TRACEABILITY
// ============================================================================
// Requirement ID: REQ-AUTH-HOOK-001
// User Story: As a developer, I want a simple hook to access authentication context.
// Acceptance Criteria:
// - Export a hook that returns the AuthContext value
// - Proper JSDoc, PUBLIC_INTERFACE marker
// GxP Impact: YES - Used to gate GxP-relevant features.
// Risk Level: LOW
// Validation Protocol: N/A
// ============================================================================

import { useContext } from "react";
import { AuthContext } from "../context/AuthContext.jsx";

// PUBLIC_INTERFACE
export function useAuth() {
  /** Return the current authentication context value.
   *
   * GxP Critical: Yes - Consumed to enforce access controls at UI actions.
   *
   * Parameters: None
   * Returns:
   * - AuthContextValue
   *
   * Throws: None
   * Audit: None
   */
  return useContext(AuthContext);
}
