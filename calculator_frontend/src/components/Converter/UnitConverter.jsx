/* ============================================================================
   REQUIREMENT TRACEABILITY
   ============================================================================
   Requirement ID: REQ-CONVERTER-FEATURE-001
   User Story: As a user, I want to perform unit conversions with validation and
               receive an accessible result, and the app must audit conversions.
   Acceptance Criteria:
     - Category selection (length, mass, temperature, volume, time)
     - From/To unit selects constrained to category
     - Validated numeric input (temp supports negatives and absolute zero)
     - Convert action via button or Enter key
     - Accessible labels, aria-live result
     - Audit log for each conversion with before/after and user context
   GxP Impact: YES - Validated conversions with audit trail.
   Risk Level: MEDIUM
   Validation Protocol: VP-CONVERTER-FEATURE-001
   ============================================================================ */
/* ============================================================================
   IMPORTS AND DEPENDENCIES
   ============================================================================ */

import React, { useMemo, useRef, useState } from "react";
import TextField from "../Common/TextField";
import Button from "../Common/Button";
import UnitSelect from "./UnitSelect";
import ConverterResult from "./ConverterResult";
import { ConversionService, getDefaultUnitsForCategory } from "../../services/ConversionService";
import { ValidationService } from "../../services/ValidationService";
import { useAudit } from "../../hooks/useAudit";
import { useAuth } from "../../hooks/useAuth";

/**
 * PUBLIC_INTERFACE
 * UnitConverter
 * Interactive converter component with validation and audit logging.
 *
 * @returns {JSX.Element}
 */
export default function UnitConverter() {
  const audit = useAudit();
  const auth = useAuth();

  const CATEGORY_OPTIONS = useMemo(
    () => [
      { label: "Length", value: "length" },
      { label: "Mass", value: "mass" },
      { label: "Temperature", value: "temperature" },
      { label: "Volume", value: "volume" },
      { label: "Time", value: "time" },
    ],
    []
  );

  const [category, setCategory] = useState("length");
  const defaults = getDefaultUnitsForCategory(category) || { from: "", to: "" };
  const [fromUnit, setFromUnit] = useState(defaults.from || "m");
  const [toUnit, setToUnit] = useState(defaults.to || "cm");
  const [value, setValue] = useState("");
  const [valueError, setValueError] = useState("");
  const [busy, setBusy] = useState(false);

  const [result, setResult] = useState(null);
  const prevSnapshotRef = useRef(null);

  // Update default units when category changes
  function handleCategoryChange(e) {
    const nextCat = e.target.value;
    setCategory(nextCat);
    const d = getDefaultUnitsForCategory(nextCat) || { from: "", to: "" };
    setFromUnit(d.from);
    setToUnit(d.to);
    setResult(null);
    setValueError("");
  }

  // Validate numeric input on blur (non-blocking)
  function validateInputSoft(val, cat) {
    if (cat === "temperature") {
      const res = ValidationService.validateTemperatureInput(val, fromUnit, { field: "Temperature" });
      if (!res.valid) {
        return res.errors?.[0]?.message || "Invalid temperature value";
      }
      return "";
    }
    // Non-temperature categories: require non-negative numeric
    const guards = { min: 0, max: 1e12 };
    const res = ValidationService.validateNumber(val, {
      field: "Value",
      required: true,
      maxDecimalPlaces: 8,
      min: guards.min,
      max: guards.max,
    });
    if (!res.valid) {
      return res.errors?.[0]?.message || "Invalid value";
    }
    return "";
  }

  function swapUnits() {
    setFromUnit(toUnit);
    setToUnit(fromUnit);
    setResult(null);
  }

  async function handleConvert(e) {
    e?.preventDefault?.();
    setValueError("");

    const err = validateInputSoft(value, category);
    if (err) {
      setValueError(err);
      return;
    }

    setBusy(true);
    const req = {
      category,
      value,
      fromUnit,
      toUnit,
    };

    try {
      const beforeSnapshot = prevSnapshotRef.current || null;

      const out = ConversionService.convert(req);
      setResult(out);

      // Prepare audit logging details
      const userId = auth.currentUser?.id || "anonymous";

      if (out.ok) {
        const details = {
          operation: "convert",
          category: out.category,
          units: { from: out.fromUnit, to: out.toUnit },
          input: out.input,
          output: out.value,
        };
        const afterSnapshot = {
          request: { ...req, value: out.input },
          response: { ok: out.ok, value: out.value },
        };

        try {
          audit.logAction(userId, "READ", "converter", details, {
            before: beforeSnapshot,
            after: afterSnapshot,
          });
        } catch (logErr) {
          audit.recordError(logErr, { userId, entity: "converter", reason: "Failed to record conversion audit" });
        }

        // Update previous snapshot for next before/after
        prevSnapshotRef.current = afterSnapshot;
      } else {
        // Record the conversion attempt failure as an error for traceability
        try {
          audit.recordError(out.error || new Error("Conversion failed"), {
            userId,
            entity: "converter",
            extra: { ...req },
            reason: "Conversion validation error",
          });
        } catch {
          // ignore
        }
      }
    } catch (errAny) {
      // Technical error capture
      const userId = auth.currentUser?.id || "anonymous";
      audit.recordError(errAny, { userId, entity: "converter", reason: "Unhandled conversion error", extra: req });
    } finally {
      setBusy(false);
    }
  }

  const categoryId = "conv-category";
  const valueId = "conv-value";
  const fromId = "conv-from";
  const toId = "conv-to";

  return (
    <form onSubmit={handleConvert} aria-label="Unit converter" style={{ display: "grid", gap: 12 }}>
      <div style={{ display: "grid", gap: 6 }}>
        <label htmlFor={categoryId}>Category</label>
        <select
          id={categoryId}
          className="select"
          value={category}
          onChange={handleCategoryChange}
          aria-describedby="conv-category-hint"
        >
          {CATEGORY_OPTIONS.map((opt) => (
            <option key={`cat-${opt.value}`} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <div id="conv-category-hint" className="field__hint">
          Choose what you want to convert.
        </div>
      </div>

      <TextField
        id={valueId}
        label="Value"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={() => setValueError(validateInputSoft(value, category))}
        placeholder="Enter a number"
        error={valueError}
      />

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, alignItems: "end" }}>
        <UnitSelect
          id={fromId}
          label="From unit"
          category={category}
          value={fromUnit}
          onChange={(e) => setFromUnit(e.target.value)}
        />
        <UnitSelect
          id={toId}
          label="To unit"
          category={category}
          value={toUnit}
          onChange={(e) => setToUnit(e.target.value)}
        />
      </div>

      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <Button type="submit" variant="primary" loading={busy} aria-label="Convert">
          Convert
        </Button>
        <Button type="button" variant="ghost" onClick={swapUnits} disabled={busy} aria-label="Swap units">
          Swap
        </Button>
      </div>

      <div aria-label="Conversion result">
        <ConverterResult result={result} />
      </div>
    </form>
  );
}
