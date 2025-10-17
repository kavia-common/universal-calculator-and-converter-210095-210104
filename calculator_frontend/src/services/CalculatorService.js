/* ============================================================================
   REQUIREMENT TRACEABILITY
   ============================================================================
   Requirement ID: REQ-CALC-SERVICE-001
   User Story: As a user, I want a calculator service that manages input digits, decimal,
               operators, equals, clear, sign toggle, and backspace with validation
               and clear error codes/messages.
   Acceptance Criteria:
     - Export functions to handle: digits, decimal, operators, equals, clear-all,
       clear-last, sign toggle; return structured results or error objects with codes
     - Prevent invalid numeric formats and multiple decimals
     - Use ValidationService for arithmetic validation and error codes
   GxP Impact: YES - Drives validated calculations and audit context.
   Risk Level: MEDIUM
   Validation Protocol: VP-CALC-SERVICE-001
   ============================================================================ */
// ============================================================================
// IMPORTS AND DEPENDENCIES
// ============================================================================
import { ValidationService } from "./ValidationService";
import { ARITHMETIC_OPS, ERROR_CODES } from "../utils/constants";
import { createValidationError } from "../utils/errorUtils";

/**
 * Internal: map common operator inputs to standardized operation keys.
 */
const OP_SYMBOL_TO_KEY = Object.freeze({
  "+": ARITHMETIC_OPS.ADD,
  "-": ARITHMETIC_OPS.SUB,
  "−": ARITHMETIC_OPS.SUB,
  "*": ARITHMETIC_OPS.MUL,
  "x": ARITHMETIC_OPS.MUL,
  "X": ARITHMETIC_OPS.MUL,
  "×": ARITHMETIC_OPS.MUL,
  "/": ARITHMETIC_OPS.DIV,
  "÷": ARITHMETIC_OPS.DIV,
  [ARITHMETIC_OPS.ADD]: ARITHMETIC_OPS.ADD,
  [ARITHMETIC_OPS.SUB]: ARITHMETIC_OPS.SUB,
  [ARITHMETIC_OPS.MUL]: ARITHMETIC_OPS.MUL,
  [ARITHMETIC_OPS.DIV]: ARITHMETIC_OPS.DIV,
});

/**
 * Internal: map standardized operation keys back to display symbols.
 */
const OP_KEY_TO_SYMBOL = Object.freeze({
  [ARITHMETIC_OPS.ADD]: "+",
  [ARITHMETIC_OPS.SUB]: "−",
  [ARITHMETIC_OPS.MUL]: "×",
  [ARITHMETIC_OPS.DIV]: "÷",
});

/**
 * Internal: determine the active operand key based on whether an operator is selected.
 * @param {CalculatorState} state
 * @returns {"a"|"b"}
 */
function getActiveOperandKey(state) {
  return state.op ? "b" : "a";
}

/**
 * Internal: sanitize a display string for operand entry.
 * @param {string} s
 * @returns {string}
 */
function normalizeEnteredString(s) {
  if (!s) return "0";
  // Remove leading zeros unless immediately before a decimal point
  if (s.startsWith("-")) {
    const body = s.slice(1);
    if (body.startsWith("0") && !body.startsWith("0.")) {
      return "-" + String(Number.parseFloat(body)).toString();
    }
    return "-" + body;
  }
  if (s.startsWith("0") && !s.startsWith("0.")) {
    const asNum = Number.parseFloat(s);
    return Number.isFinite(asNum) ? String(asNum) : s;
  }
  return s;
}

/**
 * Internal: convert operation key to symbol.
 * @param {"add"|"sub"|"mul"|"div"|null} op
 * @returns {string}
 */
function toSymbol(op) {
  return op ? OP_KEY_TO_SYMBOL[op] || "" : "";
}

/**
 * Internal: attempt to parse a numeric operand from a string.
 * @param {string} s
 * @returns {number|null}
 */
function parseOperandString(s) {
  if (s == null) return null;
  const trimmed = String(s).trim();
  if (!trimmed) return null;
  const n = Number.parseFloat(trimmed);
  return Number.isFinite(n) ? n : null;
}

/**
 * Internal: build the expression string (for small display).
 * @param {CalculatorState} state
 * @returns {string}
 */
function buildExpression(state) {
  const parts = [];
  if (state.a) parts.push(state.a);
  if (state.op) parts.push(toSymbol(state.op));
  if (state.b) parts.push(state.b);
  return parts.join(" ");
}

/**
 * @typedef {Object} CalculatorState
 * @property {string} a - Left operand as entered (string)
 * @property {string} b - Right operand as entered (string)
 * @property {"add"|"sub"|"mul"|"div"|null} op - Selected operation
 * @property {string} display - Current display text
 * @property {string} expression - Expression summary (A op B)
 * @property {{code:string,message:string}|null} error - Current error (if any)
 * @property {"digit"|"decimal"|"operator"|"equals"|"clear"|"toggle"|"backspace"|null} lastAction
 */

/**
 * PUBLIC_INTERFACE
 * createInitialState
 * Return a fresh calculator state.
 * @returns {CalculatorState}
 */
export function createInitialState() {
  return {
    a: "0",
    b: "",
    op: null,
    display: "0",
    expression: "",
    error: null,
    lastAction: null,
  };
}

/**
 * PUBLIC_INTERFACE
 * inputDigit
 * Append a digit [0-9] to the active operand.
 *
 * @param {CalculatorState} state
 * @param {string|number} digit
 * @returns {CalculatorState}
 */
export function inputDigit(state, digit) {
  const d = String(digit);
  if (!/^[0-9]$/.test(d)) return { ...state }; // ignore invalid digits

  // If previous action was equals and no operator is pending, start a new entry
  if (state.lastAction === "equals" && !state.op) {
    state = createInitialState();
  }

  const key = getActiveOperandKey(state);
  const current = state[key] || "0";

  let next;
  if (current === "0") {
    // Replace leading 0 with the new digit
    next = d;
  } else {
    next = current + d;
  }

  // Do not allow excessively long inputs (basic guard)
  if (next.length > 32) return { ...state };

  const newState = {
    ...state,
    [key]: next,
    display: next,
    expression: buildExpression({ ...state, [key]: next }),
    error: null,
    lastAction: "digit",
  };
  return newState;
}

/**
 * PUBLIC_INTERFACE
 * inputDecimal
 * Add a decimal point to the active operand if not already present.
 *
 * @param {CalculatorState} state
 * @returns {CalculatorState}
 */
export function inputDecimal(state) {
  // If previous action was equals and no operator is pending, start a new entry
  if (state.lastAction === "equals" && !state.op) {
    state = createInitialState();
  }

  const key = getActiveOperandKey(state);
  let current = state[key] || "0";
  if (current.includes(".")) return { ...state }; // prevent multiple decimals

  if (!current) {
    current = "0.";
  } else {
    current = current + ".";
  }

  const newState = {
    ...state,
    [key]: current,
    display: current,
    expression: buildExpression({ ...state, [key]: current }),
    error: null,
    lastAction: "decimal",
  };
  return newState;
}

/**
 * PUBLIC_INTERFACE
 * setOperator
 * Set or change the operator. If both operands exist, it will compute the intermediate
 * result to support chaining (without producing an error when valid).
 *
 * @param {CalculatorState} state
 * @param {string} opInput - One of "+", "-", "×", "÷", "*", "/", "x", "add|sub|mul|div"
 * @returns {CalculatorState}
 */
export function setOperator(state, opInput) {
  const op = OP_SYMBOL_TO_KEY[String(opInput)] || null;
  if (!op) return { ...state };

  // If we have both operands, attempt an intermediate compute to chain
  if (state.op && state.b) {
    const eq = equals(state);
    if (eq.ok) {
      state = eq.state;
    } else {
      // keep previous state but record error
      return {
        ...state,
        error: eq.error || createValidationError(ERROR_CODES.SYS_UNKNOWN, { field: "Operation" }),
        lastAction: "operator",
      };
    }
  }

  // If previous action was equals and there is an 'a' value, allow starting a new chain
  const newState = {
    ...state,
    op,
    expression: buildExpression({ ...state, op }),
    error: null,
    lastAction: "operator",
  };
  return newState;
}

/**
 * PUBLIC_INTERFACE
 * toggleSign
 * Toggle sign of the active operand.
 *
 * @param {CalculatorState} state
 * @returns {CalculatorState}
 */
export function toggleSign(state) {
  const key = getActiveOperandKey(state);
  const current = state[key] || "0";
  let next = current;

  if (current === "0" || current === "0." || current === "") {
    // Keep zero unsigned
    next = current;
  } else if (current.startsWith("-")) {
    next = current.slice(1);
  } else {
    next = "-" + current;
  }

  next = normalizeEnteredString(next);

  return {
    ...state,
    [key]: next,
    display: key === "b" || state.op ? next : next,
    expression: buildExpression({ ...state, [key]: next }),
    error: null,
    lastAction: "toggle",
  };
}

/**
 * PUBLIC_INTERFACE
 * clearAll
 * Reset calculator to initial state.
 * @param {CalculatorState} _state
 * @returns {CalculatorState}
 */
export function clearAll(_state) {
  return createInitialState();
}

/**
 * PUBLIC_INTERFACE
 * clearLast
 * Remove the last character from the active operand.
 *
 * @param {CalculatorState} state
 * @returns {CalculatorState}
 */
export function clearLast(state) {
  const key = getActiveOperandKey(state);
  const current = state[key] || "0";
  if (!current || current === "0") {
    // If there's nothing to clear on B but operator exists, do nothing; else reset A
    if (key === "a" && !state.op) return createInitialState();
    return { ...state, lastAction: "backspace" };
  }

  let next = current.slice(0, -1);
  if (next === "" || next === "-" || next === "-0") {
    next = "0";
  }
  const newState = {
    ...state,
    [key]: next,
    display: next,
    expression: buildExpression({ ...state, [key]: next }),
    error: null,
    lastAction: "backspace",
  };
  return newState;
}

/**
 * PUBLIC_INTERFACE
 * canCompute
 * Determine if equals operation is currently allowed based on state.
 * @param {CalculatorState} state
 * @returns {boolean}
 */
export function canCompute(state) {
  if (!state.op) return false;
  const aNum = parseOperandString(state.a);
  const bNum = parseOperandString(state.b);
  return Number.isFinite(aNum) && Number.isFinite(bNum);
}

/**
 * PUBLIC_INTERFACE
 * equals
 * Compute the result using ValidationService. Returns a structured result:
 *   { ok: true, value:number, state: CalculatorState } on success
 *   { ok: false, error: {code,message}, state: CalculatorState } on failure
 *
 * @param {CalculatorState} state
 * @returns {{ ok: true, value:number, state: CalculatorState } | { ok: false, error: {code:string, message:string}, state: CalculatorState }}
 */
export function equals(state) {
  const aNum = parseOperandString(state.a);
  const bNum = parseOperandString(state.b);
  const op = state.op || null;

  if (!op) {
    // No operator -> nothing to compute; keep state, no error
    return { ok: false, error: createValidationError(ERROR_CODES.SYS_UNKNOWN, { field: "Operation" }), state };
  }

  // Validate arithmetic inputs (required both sides)
  const validated = ValidationService.validateArithmetic(
    { a: aNum, b: bNum, op },
    { aLabel: "A", bLabel: "B" }
  );

  if (!validated.valid) {
    const firstError = validated.errors?.[0] || createValidationError(ERROR_CODES.SYS_UNKNOWN, { field: "Input" });
    const errorState = {
      ...state,
      error: firstError,
      lastAction: "equals",
    };
    return { ok: false, error: firstError, state: errorState };
  }

  const result = validated.result;
  const resultStr = String(result);

  const newState = {
    a: resultStr,
    b: "",
    op: null,
    display: resultStr,
    expression: String(resultStr),
    error: null,
    lastAction: "equals",
  };

  return { ok: true, value: result, state: newState };
}

/**
 * PUBLIC_INTERFACE
 * getOperatorSymbol
 * Utility to convert op key to a user-visible symbol.
 * @param {"add"|"sub"|"mul"|"div"|null} op
 * @returns {string}
 */
export function getOperatorSymbol(op) {
  return toSymbol(op);
}

/**
 * PUBLIC_INTERFACE
 * normalizeOperator
 * Normalize various operator inputs to op keys.
 * @param {string} input
 * @returns {"add"|"sub"|"mul"|"div"|null}
 */
export function normalizeOperator(input) {
  return OP_SYMBOL_TO_KEY[String(input)] || null;
}

/**
 * PUBLIC_INTERFACE
 * CalculatorService (namespaced export).
 */
export const CalculatorService = Object.freeze({
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
});
