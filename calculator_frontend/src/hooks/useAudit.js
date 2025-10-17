/* ============================================================================
   REQUIREMENT TRACEABILITY
   ============================================================================
   Requirement ID: REQ-AUDIT-HOOK-001
   User Story: As a developer, I want a simple hook to access the audit context.
   Acceptance Criteria:
     - Export a hook that returns the AuditContext value
     - Proper JSDoc and PUBLIC_INTERFACE marker
   GxP Impact: YES - Used to implement audit logging in UI actions.
   Risk Level: LOW
   Validation Protocol: N/A
   ============================================================================ */

import { useContext } from "react";
import { AuditContext } from "../context/AuditContext.jsx";

// PUBLIC_INTERFACE
export function useAudit() {
  /** Access the audit context value.
   *
   * GxP Critical: Yes - Consumers use this to record ALCOA+ audit entries.
   *
   * Parameters: None
   * Returns:
   * - AuditContextValue
   *
   * Throws:
   * - None
   * Audit: None
   */
  return useContext(AuditContext);
}
