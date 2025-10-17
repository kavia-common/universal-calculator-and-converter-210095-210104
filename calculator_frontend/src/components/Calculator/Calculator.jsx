/* ============================================================================
   REQUIREMENT TRACEABILITY
   ============================================================================
   Requirement ID: REQ-CALC-FEATURE-001
   User Story: As a user, I want a calculator UI that performs validated arithmetic with
               keyboard support, accessible controls, and audit logging for each compute.
   Acceptance Criteria:
     - Calculator wired to CalculatorService (digits, decimal, operators, equals, clear, sign toggle, backspace)
     - Integrate ValidationService to prevent invalid numeric formats/multiple decimals
     - Keyboard support: Enter=equals, Backspace=clear last, Escape=clear all, . decimal,
       operators + − × ÷, and sign toggle via ± button (plus F9/_ as convenience)
     - AuditService.logAction called on compute with CREATE/UPDATE including before/after and user context
     - UI shows friendly errors for divide by zero/invalid input
     - ARIA labels present, sensible tab order, disabled buttons during invalid input
   GxP Impact: YES - Validated calculations with audit trail.
   Risk Level: MEDIUM
   Validation Protocol: VP-CALC-FEATURE-001
   ============================================================================ */

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Display from "./Display";
import Keypad from "./Keypad";
import {
  createInitialState,
  inputDigit,
  inputDecimal,
  setOperator,
  toggleSign,
  clearAll,
  clearLast,
  equals,
  canCompute,
  getOperatorSymbol,
  normalizeOperator,
} from "../../services/CalculatorService";
import { useAudit } from "../../hooks/useAudit";
import { useAuth } from "../../hooks/useAuth";

/**
 * PUBLIC_INTERFACE
 * Calculator component
 * Fully interactive calculator with keyboard support and auditing on equals.
 *
 * @returns {JSX.Element}
 */
export default function Calculator() {
  const [state, setState] = useState(() => createInitialState());
  const audit = useAudit();
  const auth = useAuth();
  const containerRef = useRef(null);

  // Derived flags
  const decimalDisabled = useMemo(() => {
    const key = state.op ? "b" : "a";
    return (state[key] || "").includes(".");
  }, [state.op, state.a, state.b]);

  const equalsDisabled = useMemo(() => !canCompute(state), [state]);

  // Handlers
  const handleDigit = useCallback((d) => {
    setState((prev) => inputDigit(prev, d));
  }, []);

  const handleDecimal = useCallback(() => {
    setState((prev) => inputDecimal(prev));
  }, []);

  const handleOperator = useCallback((opSymbol) => {
    setState((prev) => setOperator(prev, opSymbol));
  }, []);

  const handleClearAll = useCallback(() => {
    setState((prev) => clearAll(prev));
  }, []);

  const handleClearLast = useCallback(() => {
    setState((prev) => clearLast(prev));
  }, []);

  const handleToggleSign = useCallback(() => {
    setState((prev) => toggleSign(prev));
  }, []);

  const handleEquals = useCallback(() => {
    setState((prev) => {
      const before = { ...prev };
      const result = equals(prev);
      if (result.ok) {
        // Audit compute operation
        const next = result.state;
        const userId = auth.currentUser?.id || "anonymous";
        try {
          const actionType = before.lastAction === "equals" ? "UPDATE" : "CREATE";
          const details = {
            operation: "compute",
            operands: { a: before.a, b: before.b },
            operator: before.op,
            operatorSymbol: getOperatorSymbol(before.op),
            result: result.value,
          };
          const beforeSnapshot = {
            a: before.a,
            b: before.b,
            op: before.op,
            display: before.display,
            expression: before.expression,
          };
          const afterSnapshot = {
            a: next.a,
            b: next.b,
            op: next.op,
            display: next.display,
            expression: next.expression,
            result: result.value,
          };
          audit.logAction(userId, actionType, "calculator", details, {
            before: beforeSnapshot,
            after: afterSnapshot,
          });
        } catch (e) {
          audit.recordError(e, {
            userId: auth.currentUser?.id || "anonymous",
            entity: "calculator",
            reason: "Failed to record compute audit",
          });
        }
        return next;
      } else {
        // Present user-friendly error in the state
        return {
          ...result.state,
          error: result.error,
        };
      }
    });
  }, [audit, auth.currentUser?.id]);

  // Ensure container is focusable for keyboard support
  useEffect(() => {
    try {
      if (typeof document !== "undefined" && document.activeElement === document.body) {
        containerRef.current?.focus();
      }
    } catch {
      // ignore focus errors
    }
  }, []);

  // Keyboard support on container
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const onKeyDown = (e) => {
      const key = e.key;
      // Digits
      if (/^[0-9]$/.test(key)) {
        e.preventDefault();
        handleDigit(key);
        return;
      }
      // Decimal
      if (key === ".") {
        e.preventDefault();
        handleDecimal();
        return;
      }
      // Equals
      if (key === "Enter" || key === "=") {
        e.preventDefault();
        if (!equalsDisabled) handleEquals();
        return;
      }
      // Backspace -> clear last
      if (key === "Backspace") {
        e.preventDefault();
        handleClearLast();
        return;
      }
      // Escape -> clear all
      if (key === "Escape") {
        e.preventDefault();
        handleClearAll();
        return;
      }
      // Operators
      if (key === "+" || key === "-" || key === "*" || key === "/" || key === "x" || key === "X") {
        e.preventDefault();
        const opKey = normalizeOperator(key);
        if (opKey) handleOperator(key);
        return;
      }
      // Sign toggle convenience: F9 or "_" or "±"
      if (key === "F9" || key === "_" || key === "±") {
        e.preventDefault();
        handleToggleSign();
      }
    };

    el.addEventListener("keydown", onKeyDown);
    return () => el.removeEventListener("keydown", onKeyDown);
  }, [handleDigit, handleDecimal, handleEquals, handleClearAll, handleClearLast, handleOperator, handleToggleSign, equalsDisabled]);

  // Accessible label explaining keyboard usage
  const kbHelp = "Keyboard: Enter=equals, Backspace=clear last, Escape=clear all, .=decimal, +/- via button, operators + − × ÷";

  return (
    <div
      ref={containerRef}
      className="calculator"
      role="group"
      aria-label="Basic calculator"
      aria-describedby="calc-kb-help"
      tabIndex={0}
      style={{ display: "grid", gap: 12 }}
    >
      <span id="calc-kb-help" className="sr-only">
        {kbHelp}
      </span>

      <Display value={state.display} expression={state.expression} error={state.error} />
      <Keypad
        onDigit={handleDigit}
        onDecimal={handleDecimal}
        onOperator={handleOperator}
        onEquals={handleEquals}
        onClearAll={handleClearAll}
        onClearLast={handleClearLast}
        onToggleSign={handleToggleSign}
        disabled={{ decimalDisabled, equalsDisabled }}
      />
    </div>
  );
}
