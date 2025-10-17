// ============================================================================
// REQUIREMENT TRACEABILITY
// ============================================================================
// Requirement ID: REQ-UI-COMPONENTS-001
// User Story: As a user, I want consistent and accessible buttons with clear states.
// Acceptance Criteria:
// - Button supports primary, secondary, and ghost variants
// - Disabled and loading states are accessible (aria-disabled/aria-busy)
// - Keyboard operable, focus-visible ring
// - Uses Ocean Professional theme colors
// GxP Impact: NO - UI control only.
// Risk Level: LOW
// Validation Protocol: N/A
// ============================================================================

import React from "react";

/**
 * PUBLIC_INTERFACE
 * Button component
 * This is a semantic button with themed variants and accessible states.
 *
 * @param {Object} props - Button props
 * @param {"primary"|"secondary"|"ghost"} [props.variant="primary"] - Visual variant
 * @param {boolean} [props.disabled=false] - Disable interaction
 * @param {boolean} [props.loading=false] - Show loading state and set aria-busy
 * @param {("button"|"submit"|"reset")} [props.type="button"] - Button type
 * @param {string} [props.className] - Additional class names
 * @param {React.ReactNode} props.children - Button label/content
 * @param {() => void} [props.onClick] - Click handler
 * @returns {JSX.Element}
 */
const Button = React.forwardRef(function Button(
  {
    variant = "primary",
    disabled = false,
    loading = false,
    type = "button",
    className = "",
    children,
    onClick,
    ...rest
  },
  ref
) {
  const classes = [
    "btn",
    variant === "secondary" ? "btn--secondary" : "",
    variant === "ghost" ? "btn--ghost" : "",
    variant === "primary" ? "btn--primary" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <button
      ref={ref}
      type={type}
      className={classes}
      onClick={onClick}
      disabled={disabled || loading}
      aria-disabled={disabled || loading ? "true" : undefined}
      aria-busy={loading ? "true" : "false"}
      {...rest}
    >
      {children}
    </button>
  );
});

export default Button;
