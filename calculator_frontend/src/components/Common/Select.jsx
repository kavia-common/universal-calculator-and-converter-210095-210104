// ============================================================================
// REQUIREMENT TRACEABILITY
// ============================================================================
// Requirement ID: REQ-UI-COMPONENTS-004
// User Story: As a user, I want dropdowns that are accessible and consistent.
// Acceptance Criteria:
// - Label associated to select using htmlFor
// - Error and hint text support
// - Disabled state accessible
// GxP Impact: NO - UI control only.
// Risk Level: LOW
// Validation Protocol: N/A
// ============================================================================

import React from "react";

/**
 * PUBLIC_INTERFACE
 * Select component.
 *
 * @param {Object} props
 * @param {string} props.id - Unique id to bind label and select
 * @param {string} props.label - Label text
 * @param {Array<{label:string,value:string|number,disabled?:boolean}>} props.options - Options list
 * @param {string|number} [props.value] - Selected value
 * @param {(e: React.ChangeEvent<HTMLSelectElement>) => void} [props.onChange] - Change handler
 * @param {boolean} [props.disabled=false] - Disabled state
 * @param {string} [props.hint] - Optional hint text
 * @param {string} [props.error] - Optional error message
 * @param {string} [props.className] - Additional class names
 * @returns {JSX.Element}
 */
export default function Select({
  id,
  label,
  options,
  value,
  onChange,
  disabled = false,
  hint,
  error,
  className = "",
  ...rest
}) {
  return (
    <div className={["field", className].filter(Boolean).join(" ")}>
      {label && <label htmlFor={id}>{label}</label>}
      <select
        id={id}
        className="select"
        value={value}
        onChange={onChange}
        disabled={disabled}
        aria-invalid={error ? "true" : undefined}
        aria-describedby={hint ? `${id}-hint` : undefined}
        {...rest}
      >
        {options?.map((opt) => (
          <option key={`${id}-opt-${String(opt.value)}`} value={opt.value} disabled={opt.disabled}>
            {opt.label}
          </option>
        ))}
      </select>
      {hint && !error && (
        <div id={`${id}-hint`} className="field__hint">
          {hint}
        </div>
      )}
      {error && <div className="field__error">{error}</div>}
    </div>
  );
}
