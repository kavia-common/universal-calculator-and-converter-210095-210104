// ============================================================================
// REQUIREMENT TRACEABILITY
// ============================================================================
// Requirement ID: REQ-UI-COMPONENTS-005
// User Story: As a user, I want text fields that are accessible and consistent.
// Acceptance Criteria:
// - Label associated with input
// - Error and hint support
// - Disabled state accessible and styled
// GxP Impact: NO - UI control only.
// Risk Level: LOW
// Validation Protocol: N/A
// ============================================================================

import React from "react";

/**
 * PUBLIC_INTERFACE
 * TextField component.
 *
 * @param {Object} props
 * @param {string} props.id - Unique id to bind label and input
 * @param {string} props.label - Label text
 * @param {string} [props.type="text"] - Input type
 * @param {string|number} [props.value] - Input value
 * @param {(e: React.ChangeEvent<HTMLInputElement>) => void} [props.onChange] - Change handler
 * @param {boolean} [props.disabled=false] - Disabled state
 * @param {string} [props.placeholder] - Placeholder text
 * @param {string} [props.hint] - Optional hint text
 * @param {string} [props.error] - Optional error message
 * @param {string} [props.className] - Additional class names
 * @returns {JSX.Element}
 */
export default function TextField({
  id,
  label,
  type = "text",
  value,
  onChange,
  disabled = false,
  placeholder,
  hint,
  error,
  className = "",
  ...rest
}) {
  return (
    <div className={["field", className].filter(Boolean).join(" ")}>
      {label && <label htmlFor={id}>{label}</label>}
      <input
        id={id}
        type={type}
        value={value}
        onChange={onChange}
        disabled={disabled}
        placeholder={placeholder}
        className="input"
        aria-invalid={error ? "true" : undefined}
        aria-describedby={hint ? `${id}-hint` : undefined}
        {...rest}
      />
      {hint && !error && (
        <div id={`${id}-hint`} className="field__hint">
          {hint}
        </div>
      )}
      {error && <div className="field__error">{error}</div>}
    </div>
  );
}
