/* ============================================================================
   REQUIREMENT TRACEABILITY
   ============================================================================
   Requirement ID: REQ-AUDIT-SERVICE-001
   User Story: As a compliance-focused engineer, I need an audit service that
               captures ALCOA+ metadata for user actions, persists records,
               supports pagination and exports, and logs technical errors.
   Acceptance Criteria:
     - logAction(userId, actionType, entity, details, options)
       captures: userId, ISO timestamp, actionType (CRUD), before/after, reason,
       correlationId, metadata (app version, user-agent)
     - getLogs({ page, pageSize, filters })
     - exportLogs()
     - clearLogs(eSign) with e-signature stub validation
     - recordError(error)
     - LocalStorage persistence keyed at "auditTrail" via StorageService
     - JSON safety and in-memory fallback on storage failure
   GxP Impact: YES - Implements the audit trail (ALCOA+ principles).
   Risk Level: MEDIUM
   Validation Protocol: VP-AUDIT-TRAIL-001
   ============================================================================ */
/* ============================================================================
   IMPORTS AND DEPENDENCIES
   ============================================================================
   - StorageService (localStorage + memory fallback)
   - App config for version metadata
   ============================================================================ */

import { getJSON, setJSON, remove as storageRemove } from "./StorageService";
import { getAppConfig } from "../config/appConfig";

// Internal constants
const AUDIT_STORAGE_KEY = "auditTrail";

// The acceptable CRUD action types for GxP-aligned logging
const ACTION_TYPES = Object.freeze(["CREATE", "READ", "UPDATE", "DELETE"]);

/**
 * Generate a reasonably unique id prefixing the scope.
 * Not cryptographically secure; sufficient for client-side correlation.
 * @param {string} scope
 * @returns {string}
 */
function generateId(scope = "id") {
  const rand = Math.random().toString(36).slice(2, 8);
  const time = Date.now().toString(36);
  return `${scope}_${time}_${rand}`;
}

/**
 * Load all audit records (internal helper).
 * @returns {Array<object>}
 */
function loadAll() {
  return getJSON(AUDIT_STORAGE_KEY, /** @type {any[]} */ ([]));
}

/**
 * Save all audit records (internal helper).
 * @param {Array<object>} records
 * @returns {boolean}
 */
function saveAll(records) {
  return setJSON(AUDIT_STORAGE_KEY, Array.isArray(records) ? records : []);
}

/**
 * Normalize to array of strings for filter helpers.
 * @param {string|string[]|undefined|null} v
 * @returns {string[]}
 */
function toStringArray(v) {
  if (v == null) return [];
  return Array.isArray(v) ? v.map((x) => String(x)) : [String(v)];
}

/**
 * Build metadata block with environment info.
 * @returns {{ appVersion: string, userAgent: string, platform: string }}
 */
function buildMetadata() {
  const cfg = getAppConfig();
  let userAgent = "unknown";
  let platform = "unknown";
  try {
    if (typeof window !== "undefined" && window.navigator) {
      userAgent = window.navigator.userAgent || "unknown";
      platform = window.navigator.platform || "unknown";
    }
  } catch {
    // ignore
  }
  return {
    appVersion: cfg.APP_VERSION,
    userAgent,
    platform,
  };
}

// PUBLIC_INTERFACE
export function logAction(userId, actionType, entity, details = {}, options = {}) {
  /** Log a user-attributed action with ALCOA+ fields.
   *
   * GxP Critical: Yes - Core audit trail entry point.
   *
   * Parameters:
   * - userId: string (required, attributable)
   * - actionType: "CREATE"|"READ"|"UPDATE"|"DELETE" (required)
   * - entity: string (required) - what object or domain was affected ("session", "calculator", "converter", ...)
   * - details: object (optional) - contextual data about the action
   * - options: {
   *     before?: any,           // state before change (if applicable)
   *     after?: any,            // state after change (if applicable)
   *     reason?: string,        // required for destructive actions (DELETE)
   *     correlationId?: string, // to tie multiple entries together
   *     metadata?: object       // optional extra metadata
   *   }
   *
   * Returns:
   * - The created log entry object
   *
   * Throws:
   * - Error when inputs are invalid or reason is missing for DELETE
   *
   * Audit:
   * - Persists entry with ISO8601 timestamp and app metadata
   */
  const uid = String(userId || "").trim();
  const act = String(actionType || "").trim().toUpperCase();
  const ent = String(entity || "").trim();

  if (!uid) throw new Error("Audit logAction: userId is required");
  if (!ACTION_TYPES.includes(act)) throw new Error(`Audit logAction: unsupported actionType "${act}"`);
  if (!ent) throw new Error("Audit logAction: entity is required");

  const reason = typeof options.reason === "string" ? options.reason.trim() : undefined;
  if (act === "DELETE" && !reason) {
    throw new Error("Audit logAction: reason is required for destructive actions (DELETE).");
  }

  const entry = {
    id: generateId("audit"),
    userId: uid,
    timestamp: new Date().toISOString(),
    actionType: act,
    entity: ent,
    details: details && typeof details === "object" ? { ...details } : { value: String(details ?? "") },
    before: options.before ?? null,
    after: options.after ?? null,
    reason: reason ?? null,
    correlationId: options.correlationId || generateId("corr"),
    metadata: {
      ...buildMetadata(),
      ...(options.metadata && typeof options.metadata === "object" ? options.metadata : {}),
    },
  };

  const all = loadAll();
  all.push(entry);
  saveAll(all);

  return entry;
}

// PUBLIC_INTERFACE
export function getLogs(params = {}) {
  /** Retrieve paginated logs with optional filters.
   *
   * GxP Critical: Yes - Supports data availability and traceability.
   *
   * Parameters:
   * - params: {
   *     page?: number (default 1),
   *     pageSize?: number (default 20),
   *     filters?: {
   *       userId?: string|string[],
   *       actionType?: string|string[],
   *       entity?: string|string[],
   *       from?: string|Date, // inclusive
   *       to?: string|Date,   // inclusive
   *       correlationId?: string,
   *       text?: string       // search in serialized entry
   *     }
   *   }
   *
   * Returns:
   * - { items: object[], total: number, page: number, pageSize: number, totalPages: number }
   *
   * Throws:
   * - None
   */
  const page = Math.max(1, Math.floor(params.page || 1));
  const pageSize = Math.max(1, Math.floor(params.pageSize || 20));
  const filters = params.filters || {};

  const userIds = toStringArray(filters.userId).map((s) => s.trim()).filter(Boolean);
  const actionTypes = toStringArray(filters.actionType).map((s) => s.trim().toUpperCase()).filter(Boolean);
  const entities = toStringArray(filters.entity).map((s) => s.trim()).filter(Boolean);
  const correlationId = typeof filters.correlationId === "string" ? filters.correlationId.trim() : undefined;
  const text = typeof filters.text === "string" ? filters.text.trim().toLowerCase() : undefined;

  let fromTime = undefined;
  let toTime = undefined;
  try {
    if (filters.from) fromTime = new Date(filters.from).getTime();
    // eslint-disable-next-line no-empty
  } catch {}
  try {
    if (filters.to) toTime = new Date(filters.to).getTime();
    // eslint-disable-next-line no-empty
  } catch {}

  const all = loadAll();

  const filtered = all.filter((entry) => {
    if (userIds.length > 0 && !userIds.includes(String(entry.userId))) return false;
    if (actionTypes.length > 0 && !actionTypes.includes(String(entry.actionType))) return false;
    if (entities.length > 0 && !entities.includes(String(entry.entity))) return false;
    if (correlationId && String(entry.correlationId) !== correlationId) return false;

    if (fromTime || toTime) {
      const t = Date.parse(entry.timestamp);
      if (Number.isFinite(fromTime) && t < fromTime) return false;
      if (Number.isFinite(toTime) && t > toTime) return false;
    }

    if (text) {
      try {
        const hay = JSON.stringify(entry).toLowerCase();
        if (!hay.includes(text)) return false;
      } catch {
        // If serialization fails, skip text filtering
      }
    }

    return true;
  });

  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const start = (page - 1) * pageSize;
  const items = filtered.slice(start, start + pageSize);

  return { items, total, page, pageSize, totalPages };
}

// PUBLIC_INTERFACE
export function exportLogs(format = "json") {
  /** Export all logs in the requested format.
   *
   * GxP Critical: Yes - Supports traceability, review, and archival.
   *
   * Parameters:
   * - format: "json"|"csv" (default "json")
   *
   * Returns:
   * - { filename: string, mimeType: string, content: string }
   *
   * Throws:
   * - Error for unsupported formats
   */
  const all = loadAll();
  const ts = new Date().toISOString().replace(/[:.]/g, "-");

  if (format === "json") {
    const content = JSON.stringify(all, null, 2);
    return {
      filename: `audit-export-${ts}.json`,
      mimeType: "application/json",
      content,
    };
  }

  if (format === "csv") {
    // Minimal CSV with core fields; complex objects are JSON-stringified
    const headers = [
      "id",
      "timestamp",
      "userId",
      "actionType",
      "entity",
      "reason",
      "correlationId",
      "details",
      "before",
      "after",
      "metadata",
    ];
    const rows = [headers.join(",")];
    for (const e of all) {
      const row = [
        e.id,
        e.timestamp,
        e.userId,
        e.actionType,
        e.entity,
        e.reason ?? "",
        e.correlationId,
        JSON.stringify(e.details ?? null),
        JSON.stringify(e.before ?? null),
        JSON.stringify(e.after ?? null),
        JSON.stringify(e.metadata ?? null),
      ]
        .map((v) => {
          const s = String(v ?? "");
          // Escape double quotes and wrap with quotes to be CSV safe
          return `"${s.replace(/"/g, '""')}"`;
        })
        .join(",");
      rows.push(row);
    }
    return {
      filename: `audit-export-${ts}.csv`,
      mimeType: "text/csv",
      content: rows.join("\n"),
    };
  }

  throw new Error(`Unsupported export format: ${format}`);
}

// PUBLIC_INTERFACE
export function clearLogs(eSign) {
  /** Clear all audit logs with an electronic signature stub.
   *
   * GxP Critical: Yes - Destructive operation; requires e-signature.
   *
   * Parameters:
   * - eSign: { username: string, password: string, reason?: string }
   *
   * Returns:
   * - { cleared: number, timestamp: string }
   *
   * Throws:
   * - Error when signature is missing or invalid
   *
   * Audit:
   * - This action is destructive on client-side storage; in real systems, this
   *   should be handled server-side with immutable records. Here we only provide
   *   a stub to demonstrate UX flow.
   */
  const u = eSign?.username ? String(eSign.username).trim() : "";
  const p = eSign?.password ? String(eSign.password) : "";
  if (!u || !p) {
    throw new Error("Electronic signature required (username and password).");
  }

  const existing = loadAll();
  const count = existing.length;

  // Clear storage
  storageRemove(AUDIT_STORAGE_KEY);
  setJSON(AUDIT_STORAGE_KEY, []);

  return {
    cleared: count,
    timestamp: new Date().toISOString(),
  };
}

// PUBLIC_INTERFACE
export function recordError(error, context = {}) {
  /** Capture a technical error into the audit trail for compliance diagnostics.
   *
   * GxP Critical: Yes - Error events must be captured for traceability.
   *
   * Parameters:
   * - error: any Error-like object
   * - context?: { userId?: string, correlationId?: string, reason?: string, entity?: string, extra?: object }
   *
   * Returns:
   * - The created log entry object, or null if logging fails
   *
   * Throws:
   * - None (internally guarded)
   *
   * Audit:
   * - actionType uses READ to align with CRUD constraint while recording diagnostics
   */
  try {
    const userId = String(context?.userId || "system");
    const entity = String(context?.entity || "error");
    const details = {
      name: error?.name ?? "Error",
      message: error?.message ?? String(error ?? "unknown error"),
      stack: error?.stack ?? null,
      ...(context?.extra && typeof context.extra === "object" ? context.extra : {}),
    };
    const options = {
      reason: context?.reason || "Technical error captured",
      correlationId: context?.correlationId,
    };
    return logAction(userId, "READ", entity, details, options);
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error("[AuditService] Failed to record error", e);
    return null;
  }
}
