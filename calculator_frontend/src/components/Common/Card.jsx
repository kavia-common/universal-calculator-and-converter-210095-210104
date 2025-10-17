// ============================================================================
// REQUIREMENT TRACEABILITY
// ============================================================================
// Requirement ID: REQ-UI-COMPONENTS-002
// User Story: As a user, I want content grouped in clear, accessible cards.
// Acceptance Criteria:
// - Card with optional title and actions
// - Accessible region with aria-labelledby
// - Ocean Professional styling
// GxP Impact: NO - UI control only.
// Risk Level: LOW
// Validation Protocol: N/A
// ============================================================================

import React, { useId } from "react";

/**
 * PUBLIC_INTERFACE
 * Card layout component with optional header and actions.
 *
 * @param {Object} props - Props
 * @param {string} [props.title] - Optional title for the card header
 * @param {React.ReactNode} [props.actions] - Optional header actions
 * @param {React.ReactNode} props.children - Card content
 * @param {string} [props.className] - Additional class names
 * @param {string} [props.role="region"] - ARIA role for the card container
 * @returns {JSX.Element}
 */
export default function Card({
  title,
  actions,
  children,
  className = "",
  role = "region",
  ...rest
}) {
  const headingId = useId();

  return (
    <section
      className={["card", className].filter(Boolean).join(" ")}
      role={role}
      aria-labelledby={title ? headingId : undefined}
      {...rest}
    >
      {(title || actions) && (
        <header className="card__header">
          {title ? (
            <h2 id={headingId} className="card__title">
              {title}
            </h2>
          ) : (
            <span />
          )}
          {actions ? <div className="card__actions">{actions}</div> : null}
        </header>
      )}
      <div className="card__body">{children}</div>
    </section>
  );
}
