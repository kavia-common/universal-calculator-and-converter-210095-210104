// ============================================================================
// REQUIREMENT TRACEABILITY
// ============================================================================
// Requirement ID: REQ-UI-LAYOUT-001
// User Story: As a user, I want a two-panel layout with calculator on the left and converter on the right.
// Acceptance Criteria:
// - Two responsive panels; stack on smaller screens
// - Panels use Card component with titles/actions
// - Accessible structure with clear headings
// GxP Impact: NO - Layout only.
// Risk Level: LOW
// Validation Protocol: N/A
// ============================================================================

import React from "react";
import Card from "../Common/Card";

/**
 * PUBLIC_INTERFACE
 * TwoPanelLayout
 * Renders two responsive panels using Card components. Left is typically Calculator,
 * Right is typically Unit Converter. Stacks into a single column on small screens.
 *
 * @param {Object} props - Props
 * @param {string} props.leftTitle - Title for the left panel
 * @param {string} props.rightTitle - Title for the right panel
 * @param {React.ReactNode} props.leftContent - Content for the left panel
 * @param {React.ReactNode} props.rightContent - Content for the right panel
 * @param {React.ReactNode} [props.leftActions] - Optional actions for left card header
 * @param {React.ReactNode} [props.rightActions] - Optional actions for right card header
 * @param {string} [props.className] - Optional extra class on layout
 * @returns {JSX.Element}
 */
export default function TwoPanelLayout({
  leftTitle,
  rightTitle,
  leftContent,
  rightContent,
  leftActions,
  rightActions,
  className = "",
}) {
  return (
    <div className={["two-panel-layout", className].filter(Boolean).join(" ")}>
      <Card title={leftTitle} actions={leftActions}>
        {leftContent}
      </Card>

      <Card title={rightTitle} actions={rightActions}>
        {rightContent}
      </Card>
    </div>
  );
}
