/* ============================================================================
   REQUIREMENT TRACEABILITY
   ============================================================================
   Requirement ID: REQ-ESIGN-UI-001
   User Story: As an admin, I want an accessible modal to provide an electronic
               signature (username, password/passphrase, reason/comment) to
               authorize critical actions like clearing or exporting audit logs.
   Acceptance Criteria:
     - Accessible dialog, labelled, focus-trapped
     - Validates required fields; destructive operations require reason/comment
     - Submits via EsignService verification and returns payload to caller
     - Friendly messages for user; technical errors go to AuditService
   GxP Impact: YES - Electronic signature capture for critical operations.
   Risk Level: MEDIUM
   Validation Protocol: VP-ESIGN-UI-001
   ============================================================================ */
/* ============================================================================
   IMPORTS AND DEPENDENCIES
   ============================================================================ */

import React, { useEffect, useMemo, useRef, useState } from "react";
import Modal from "../Common/Modal";
import TextField from "../Common/TextField";
import Button from "../Common/Button";
import { useAudit } from "../../hooks/useAudit";
import { useAuth } from "../../hooks/useAuth";
import { verifyCredentials, createSignaturePayload } from "../../services/EsignService";

/**
 * PUBLIC_INTERFACE
 * EsignModal
 * Capture and verify an electronic signature. On success, returns an object:
 *   { payload: ESignPayload, credentials: { username, password, reason } }
 * Callers should only use credentials for immediate backend/service verification
 * and MUST NOT store credentials in logs or state.
 *
 * Props:
 * - open: boolean - show/hide
 * - onCancel: () => void - cancel handler
 * - onSubmit: (result: { payload: any, credentials: { username:string, password:string, reason?:string } }) => void
 * - title?: string - dialog title
 * - actionLabel?: string - submit button label
 * - requireJustification?: boolean - require reason and comment (for destructive actions)
 * - defaultUsername?: string - prefill username if known
 *
 * Returns: JSX.Element|null
 */
export default function EsignModal({
  open,
  onCancel,
  onSubmit,
  title = "Electronic Signature Required",
  actionLabel = "Sign & Continue",
  requireJustification = false,
  defaultUsername = "",
}) {
  const audit = useAudit();
  const auth = useAuth();

  const [username, setUsername] = useState(defaultUsername || auth.currentUser?.username || "");
  const [password, setPassword] = useState("");
  const [reason, setReason] = useState("");
  const [comment, setComment] = useState("");
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [formMessage, setFormMessage] = useState("");

  // Keep username prefill up to date when modal opens
  useEffect(() => {
    if (open) {
      setUsername(defaultUsername || auth.currentUser?.username || "");
      setPassword("");
      setReason("");
      setComment("");
      setErrors({});
      setFormMessage("");
      // focus will be applied by focus trap initialization
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Focus trap for all focusable elements inside the currently open modal
  useEffect(() => {
    if (!open) return;
    // Try to scope to the active dialog element
    const dialogEl = document.querySelector(".modal");
    if (!dialogEl) return;

    // Initial focus: first form input if present
    const focusables = dialogEl.querySelectorAll(
      'button, [href], input:not([type="hidden"]), select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    if (focusables.length > 0) {
      // prefer the username input
      const userField = dialogEl.querySelector('input[name="esign-username"]');
      (userField || focusables[0]).focus();
    }

    const handleKeydown = (e) => {
      if (e.key !== "Tab") return;

      const elements = Array.from(
        dialogEl.querySelectorAll(
          'button, [href], input:not([type="hidden"]), select, textarea, [tabindex]:not([tabindex="-1"])'
        )
      ).filter((el) => !el.hasAttribute("disabled") && el.getAttribute("aria-hidden") !== "true");

      if (elements.length === 0) return;

      const first = elements[0];
      const last = elements[elements.length - 1];
      const isShift = e.shiftKey;
      const active = document.activeElement;

      if (!isShift && active === last) {
        e.preventDefault();
        first.focus();
      } else if (isShift && active === first) {
        e.preventDefault();
        last.focus();
      }
    };

    dialogEl.addEventListener("keydown", handleKeydown);
    return () => dialogEl.removeEventListener("keydown", handleKeydown);
  }, [open]);

  const requireReason = requireJustification;
  const requireComment = requireJustification;

  const validate = useMemo(
    () => (values) => {
      /** Basic field validation */
      const errs = {};
      if (!values.username?.trim()) errs.username = "Username is required.";
      if (!values.password) errs.password = "Password/passphrase is required.";
      if (requireReason && !values.reason?.trim()) errs.reason = "Reason is required for this action.";
      if (requireComment && !values.comment?.trim()) errs.comment = "Comment is required for this action.";
      return errs;
    },
    [requireReason, requireComment]
  );

  async function handleSubmit(e) {
    e?.preventDefault?.();
    setFormMessage("");
    const vals = { username, password, reason, comment };
    const v = validate(vals);
    setErrors(v);
    if (Object.keys(v).length > 0) {
      setFormMessage("Please correct the highlighted fields.");
      return;
    }

    setSubmitting(true);
    try {
      const user = await verifyCredentials(username, password);
      // Create signature payload bound to signer and timestamp
      const payload = createSignaturePayload(user.id, reason, comment);

      onSubmit?.({
        payload,
        credentials: {
          username: String(username),
          password: String(password),
          reason: reason ? String(reason) : undefined,
        },
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Verification failed";
      setFormMessage(`Verification failed: ${msg}`);
      try {
        audit.recordError(err, {
          entity: "esign",
          reason: "Electronic signature verification failed",
          extra: { username: String(username || "") },
        });
      } catch {
        // swallow
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal open={open} title={title} onClose={onCancel}>
      <form onSubmit={handleSubmit} aria-label="Electronic Signature Form">
        <TextField
          id="esign-username"
          label="Username"
          name="esign-username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="Enter your username"
          error={errors.username}
        />
        <TextField
          id="esign-password"
          label="Password / Passphrase"
          type="password"
          name="esign-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Enter your password or passphrase"
          error={errors.password}
        />

        <TextField
          id="esign-reason"
          label={`Reason${requireReason ? " *" : ""}`}
          name="esign-reason"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Describe the reason for this action"
          error={errors.reason}
          hint={!requireReason ? "Optional" : undefined}
        />

        <TextField
          id="esign-comment"
          label={`Comment${requireComment ? " *" : ""}`}
          name="esign-comment"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Add any additional justification or comments"
          error={errors.comment}
          hint={!requireComment ? "Optional" : undefined}
        />

        {formMessage && (
          <div role="status" style={{ color: "var(--color-error)", marginBottom: 8 }}>
            {formMessage}
          </div>
        )}

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 8 }}>
          <Button type="button" variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" loading={submitting} aria-label={actionLabel}>
            {actionLabel}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
