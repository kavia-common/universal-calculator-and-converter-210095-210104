// ============================================================================
// REQUIREMENT TRACEABILITY
// ============================================================================
// Requirement ID: REQ-UI-COMPONENTS-003
// User Story: As an admin, I want to view modal dialogs that are accessible.
// Acceptance Criteria:
// - Role="dialog" with aria-modal and labelled title
// - Close on ESC and overlay click
// - Focus management on open
// GxP Impact: NO - UI control only.
// Risk Level: LOW
// Validation Protocol: N/A
// ============================================================================

import React, { useEffect, useRef } from "react";
import Button from "./Button";

/**
 * PUBLIC_INTERFACE
 * Modal component for dialogs. Renders nothing when not open.
 *
 * @param {Object} props
 * @param {boolean} props.open - Whether the modal is visible
 * @param {string} props.title - Title for aria labelling
 * @param {() => void} props.onClose - Close handler
 * @param {React.ReactNode} props.children - Modal content
 * @returns {JSX.Element|null}
 */
export default function Modal({ open, title, onClose, children }) {
  const closeBtnRef = useRef(null);
  const titleIdRef = useRef(`modal-title-${Math.random().toString(36).slice(2)}`);

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (e) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose?.();
      }
    };
    document.addEventListener("keydown", onKeyDown);

    // Move focus to close button for accessibility
    const t = setTimeout(() => {
      closeBtnRef.current?.focus();
    }, 0);

    return () => {
      clearTimeout(t);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="modal-backdrop"
      onMouseDown={(e) => {
        // Close when clicking backdrop (but not when clicking inside dialog)
        if (e.target === e.currentTarget) onClose?.();
      }}
      aria-hidden={!open}
    >
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleIdRef.current : undefined}
      >
        <header className="modal__header">
          {title ? (
            <h3 id={titleIdRef.current} className="modal__title">
              {title}
            </h3>
          ) : (
            <span />
          )}
          <Button
            ref={closeBtnRef}
            variant="ghost"
            aria-label="Close dialog"
            onClick={onClose}
          >
            Close
          </Button>
        </header>
        <div className="modal__body">{children}</div>
      </div>
    </div>
  );
}
