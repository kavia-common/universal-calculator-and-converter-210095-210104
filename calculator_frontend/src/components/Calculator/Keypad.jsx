/* ============================================================================
   REQUIREMENT TRACEABILITY
   ============================================================================
   Requirement ID: REQ-CALC-UI-002
   User Story: As a user, I want an accessible keypad for entering digits and operations,
               with keyboard support and sensible tab order.
   Acceptance Criteria:
     - Buttons for digits, decimal, operators, equals, clear, backspace, sign toggle
     - ARIA labels and roles
     - Buttons disabled when not applicable (e.g., decimal when already present)
     - Keyboard operable via container in Calculator.jsx
   GxP Impact: NO - UI only.
   Risk Level: LOW
   Validation Protocol: N/A
   ============================================================================ */

import React from "react";
import Button from "../Common/Button";

/**
 * PUBLIC_INTERFACE
 * Keypad component
 *
 * @param {Object} props
 * @param {(d:string) => void} props.onDigit
 * @param {() => void} props.onDecimal
 * @param {(op:string) => void} props.onOperator
 * @param {() => void} props.onEquals
 * @param {() => void} props.onClearAll
 * @param {() => void} props.onClearLast
 * @param {() => void} props.onToggleSign
 * @param {{ decimalDisabled?: boolean, equalsDisabled?: boolean }} [props.disabled]
 * @returns {JSX.Element}
 */
export default function Keypad({
  onDigit,
  onDecimal,
  onOperator,
  onEquals,
  onClearAll,
  onClearLast,
  onToggleSign,
  disabled = {},
}) {
  const gridStyle = {
    display: "grid",
    gridTemplateColumns: "repeat(4, 1fr)",
    gap: 8,
  };

  const DigitBtn = ({ d, label }) => (
    <Button
      type="button"
      variant="secondary"
      aria-label={label || `Digit ${d}`}
      onClick={() => onDigit(String(d))}
    >
      {d}
    </Button>
  );

  return (
    <div className="calc-keypad" role="group" aria-label="Calculator keypad" style={{ marginTop: 12 }}>
      <div style={gridStyle}>
        <Button type="button" variant="ghost" aria-label="Clear entry" onClick={onClearLast}>
          ⌫
        </Button>
        <Button type="button" variant="ghost" aria-label="Clear all" onClick={onClearAll}>
          C
        </Button>
        <Button type="button" variant="ghost" aria-label="Toggle sign" onClick={onToggleSign}>
          ±
        </Button>
        <Button type="button" variant="ghost" aria-label="Divide" onClick={() => onOperator("÷")}>
          ÷
        </Button>

        <DigitBtn d="7" />
        <DigitBtn d="8" />
        <DigitBtn d="9" />
        <Button type="button" variant="ghost" aria-label="Multiply" onClick={() => onOperator("×")}>
          ×
        </Button>

        <DigitBtn d="4" />
        <DigitBtn d="5" />
        <DigitBtn d="6" />
        <Button type="button" variant="ghost" aria-label="Subtract" onClick={() => onOperator("−")}>
          −
        </Button>

        <DigitBtn d="1" />
        <DigitBtn d="2" />
        <DigitBtn d="3" />
        <Button type="button" variant="ghost" aria-label="Add" onClick={() => onOperator("+")}>
          +
        </Button>

        <Button
          type="button"
          variant="secondary"
          aria-label="Digit 0"
          onClick={() => onDigit("0")}
        >
          0
        </Button>
        <Button
          type="button"
          variant="secondary"
          aria-label="Decimal"
          onClick={onDecimal}
          disabled={!!disabled.decimalDisabled}
          aria-disabled={disabled.decimalDisabled ? "true" : undefined}
        >
          .
        </Button>
        <div aria-hidden="true" />
        <Button
          type="button"
          variant="primary"
          aria-label="Equals"
          onClick={onEquals}
          disabled={!!disabled.equalsDisabled}
          aria-disabled={disabled.equalsDisabled ? "true" : undefined}
        >
          =
        </Button>
      </div>
    </div>
  );
}
