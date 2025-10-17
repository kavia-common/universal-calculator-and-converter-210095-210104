/* ============================================================================
   REQUIREMENT TRACEABILITY
   ============================================================================
   Requirement ID: REQ-CONVERTER-UI-001
   User Story: As a user, I want an accessible unit dropdown that shows valid
               units for my selected category.
   Acceptance Criteria:
     - Shows units for category (length, mass, temp, volume, time)
     - Accessible label association
     - Integrates with Select component
   GxP Impact: NO - UI control only.
   Risk Level: LOW
   Validation Protocol: N/A
   ============================================================================ */

import React from "react";
import Select from "../Common/Select";
import { getUnitsForCategory } from "../../services/ConversionService";

/**
 * PUBLIC_INTERFACE
 * UnitSelect
 * Unit dropdown constrained by the selected category.
 *
 * @param {Object} props
 * @param {string} props.id - Unique id for the select
 * @param {string} props.label - Label text
 * @param {"length"|"mass"|"temperature"|"volume"|"time"|string} props.category - Unit category
 * @param {string} props.value - Selected unit value
 * @param {(e: React.ChangeEvent<HTMLSelectElement>) => void} props.onChange - Change handler
 * @param {boolean} [props.disabled=false]
 * @param {string} [props.error]
 * @param {string} [props.hint]
 * @returns {JSX.Element}
 */
export default function UnitSelect({ id, label, category, value, onChange, disabled = false, error, hint }) {
  const options = getUnitsForCategory(category);
  return (
    <Select
      id={id}
      label={label}
      options={options}
      value={value}
      onChange={onChange}
      disabled={disabled}
      error={error}
      hint={hint}
    />
  );
}
