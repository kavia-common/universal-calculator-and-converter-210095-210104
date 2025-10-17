/* ============================================================================
   REQUIREMENT TRACEABILITY
   ============================================================================
   Requirement ID: REQ-AUDIT-CONTEXT-001
   User Story: As a developer, I want a React context to access audit functions
               and the current logs, so UI components can easily record actions.
   Acceptance Criteria:
     - Provider exposes: logs state, logAction, getLogs, exportLogs, clearLogs
     - Uses AuditService for persistence and operations
     - Handles errors gracefully and does not break UI
   GxP Impact: YES - Enables consistent audit trail across the UI.
   Risk Level: LOW
   Validation Protocol: N/A
   ============================================================================ */
/* ============================================================================
   IMPORTS AND DEPENDENCIES
   ============================================================================ */

import React, { createContext, useCallback, useEffect, useMemo, useState } from "react";
import { logAction as svcLogAction, getLogs as svcGetLogs, exportLogs as svcExportLogs, clearLogs as svcClearLogs, recordError as svcRecordError } from "../services/AuditService";

/**
 * @typedef {object} AuditContextValue
 * @property {Array<object>} logs - Current in-memory logs (not paginated)
 * @property {(userId:string, actionType:string, entity:string, details?:any, options?:object) => object|null} logAction
 * @property {(params?:object) => {items:object[], total:number, page:number, pageSize:number, totalPages:number}} getLogs
 * @property {(format?: "json"|"csv") => { filename:string, mimeType:string, content:string }} exportLogs
 * @property {(eSign: {username:string, password:string, reason?:string}) => {cleared:number, timestamp:string}} clearLogs
 * @property {(error:any, context?:object) => object|null} recordError
 */

const defaultValue = /** @type {AuditContextValue} */ ({
  logs: [],
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  logAction: (_userId, _actionType, _entity, _details, _options) => null,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  getLogs: (_params) => ({ items: [], total: 0, page: 1, pageSize: 20, totalPages: 1 }),
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  exportLogs: (_format) => ({ filename: "audit-export.json", mimeType: "application/json", content: "[]" }),
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  clearLogs: (_eSign) => ({ cleared: 0, timestamp: new Date().toISOString() }),
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  recordError: (_error, _context) => null,
});

export const AuditContext = createContext(defaultValue);
AuditContext.displayName = "AuditContext";

// PUBLIC_INTERFACE
export function AuditProvider({ children }) {
  /** Provider that exposes audit functions and maintains a snapshot of logs.
   *
   * GxP Critical: Yes - Centralizes logging across the UI.
   *
   * Parameters:
   * - children: React.ReactNode
   *
   * Returns:
   * - JSX.Element
   *
   * Throws:
   * - None
   *
   * Audit:
   * - None directly; delegates to AuditService.
   */
  const [logs, setLogs] = useState(() => {
    // Load all logs on first render (big page size to fetch all)
    try {
      const res = svcGetLogs({ page: 1, pageSize: Number.MAX_SAFE_INTEGER });
      return res.items ?? [];
    } catch {
      return [];
    }
  });

  // Keep logs in sync at mount in case of external changes (no external writer expected here)
  useEffect(() => {
    try {
      const res = svcGetLogs({ page: 1, pageSize: Number.MAX_SAFE_INTEGER });
      setLogs(res.items ?? []);
    } catch {
      // ignore
    }
  }, []);

  const logAction = useCallback((userId, actionType, entity, details, options) => {
    try {
      const entry = svcLogAction(userId, actionType, entity, details, options);
      setLogs((prev) => [...prev, entry]);
      return entry;
    } catch (e) {
      // Fallback to error recording
      svcRecordError(e, { entity: "audit-logAction", userId: String(userId || "system") });
      return null;
    }
  }, []);

  const recordError = useCallback((error, context) => {
    try {
      const entry = svcRecordError(error, context);
      if (entry) setLogs((prev) => [...prev, entry]);
      return entry;
    } catch {
      return null;
    }
  }, []);

  const getLogs = useCallback((params) => {
    return svcGetLogs(params);
  }, []);

  const exportLogs = useCallback((format) => {
    return svcExportLogs(format);
  }, []);

  const clearLogs = useCallback((eSign) => {
    const res = svcClearLogs(eSign);
    setLogs([]);
    return res;
  }, []);

  const value = useMemo(
    () => ({
      logs,
      logAction,
      getLogs,
      exportLogs,
      clearLogs,
      recordError,
    }),
    [logs, logAction, getLogs, exportLogs, clearLogs, recordError]
  );

  return <AuditContext.Provider value={value}>{children}</AuditContext.Provider>;
}
