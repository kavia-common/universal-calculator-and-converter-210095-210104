/* ============================================================================
   REQUIREMENT TRACEABILITY
   ============================================================================
   Requirement ID: REQ-CONVERTER-UI-002
   User Story: As a user, I want a clear, accessible display of conversion results
               with the input and output values and units.
   Acceptance Criteria:
     - Show input value/unit and converted value/unit
     - Provide aria-live region for updates
     - Friendly messaging on errors
   GxP Impact: NO - UI presentation only.
   Risk Level: LOW
   Validation Protocol: N/A
   ============================================================================ */

import React from "react";
import { formatNumber } from "../../utils/formatters";

/**
 * PUBLIC_INTERFACE
 * ConverterResult
 * Present the conversion result or a friendly status.
 *
 * @param {Object} props
 * @param {{ ok:boolean, value?:number, input?:number, category?:string, fromUnit?:string, toUnit?:string, error?:{code:string,message:string} }} props.result
 * @returns {JSX.Element}
 */
export default function ConverterResult({ result }) {
  if (!result) {
    return (
      <div role="status" aria-live="polite" style={{ color: "var(--color-muted)" }}>
        Enter a value and select units to see the conversion.
      </div>
    );
  }

  if (!result.ok) {
    return (
      <div role="alert" aria-live="assertive" style={{ color: "var(--color-error)" }}>
        {result.error?.message || "Conversion failed."}
      </div>
    );
  }

  const inputStr = formatNumber(result.input ?? NaN, { maximumFractionDigits: 8 });
  const valueStr = formatNumber(result.value ?? NaN, { maximumFractionDigits: 8 });

  return (
    <div role="status" aria-live="polite">
      <div style={{ fontWeight: 600 }}>
        Result: {valueStr} {result.toUnit}
      </div>
      <div style={{ color: "var(--color-muted)", marginTop: 4 }}>
        From: {inputStr} {result.fromUnit}
      </div>
    </div>
  );
}
