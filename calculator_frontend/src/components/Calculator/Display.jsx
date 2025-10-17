/* ============================================================================
   REQUIREMENT TRACEABILITY
   ============================================================================
   Requirement ID: REQ-CALC-UI-001
   User Story: As a user, I want a clear display area that shows my current entry,
               expression context, and any errors in a user-friendly manner.
   Acceptance Criteria:
     - Present main number prominently
     - Show expression (A op B)
     - User-friendly error message region with ARIA
   GxP Impact: NO - UI only; no business logic.
   Risk Level: LOW
   Validation Protocol: N/A
   ============================================================================ */

import React from "react";

/**
 * PUBLIC_INTERFACE
 * Display component
 * Renders expression, main value, and an error message if present.
 *
 * @param {Object} props
 * @param {string} props.value - Main display string
 * @param {string} [props.expression] - Expression string ("A op B")
 * @param {{code:string,message:string}|null} [props.error] - Error to show
 * @returns {JSX.Element}
 */
export default function Display({ value, expression, error }) {
  return (
    <div
      className="calc-display"
      role="region"
      aria-label="Calculator display"
      style={{
        display: "grid",
        gap: 4,
        padding: 12,
        border: "1px solid var(--border-color)",
        borderRadius: "var(--radius-sm)",
        background: "var(--color-surface)",
      }}
    >
      <div
        className="calc-display__expression"
        style={{ color: "var(--color-muted)", fontSize: "0.95rem", minHeight: 18 }}
        aria-live="polite"
      >
        {expression || ""}
      </div>
      <div
        className="calc-display__value"
        style={{ fontSize: "1.8rem", fontWeight: 700, textAlign: "right", minHeight: 36 }}
        aria-live="polite"
      >
        {value}
      </div>
      {error ? (
        <div
          className="calc-display__error"
          role="alert"
          aria-live="assertive"
          style={{ color: "var(--color-error)", fontSize: "0.95rem" }}
        >
          {error.message}
        </div>
      ) : (
        <div className="sr-only" aria-live="polite">
          No errors
        </div>
      )}
    </div>
  );
}
