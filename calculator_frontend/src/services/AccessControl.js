// ============================================================================
// REQUIREMENT TRACEABILITY
// ============================================================================
// Requirement ID: REQ-AUTH-ACCESS-001
// User Story: As an app developer, I need an access control utility that provides
//             role-based guards and an easy way to check if a user can perform
//             an action.
// Acceptance Criteria:
// - Define roles (viewer, user, admin) and their hierarchy
// - Expose hasRole(userRoles, requiredRole) for hierarchical checks
// - Expose canPerform(action, roleRequirements, userRoles?) for UI guards
// - Export simple helpers usable by UI components
// GxP Impact: YES - Access control determines availability of operations.
// Risk Level: LOW
// Validation Protocol: N/A
// ============================================================================
//
// IMPORTS AND DEPENDENCIES
// None - standalone utility
// ============================================================================

/**
 * Ocean Professional - Access Control Utilities
 * Minimal role-based authorization helpers with hierarchical role support.
 */

// Role constants (lowercase to avoid case issues)
export const ROLES = Object.freeze({
  VIEWER: "viewer",
  USER: "user",
  ADMIN: "admin",
});

// Internal role ranking for hierarchical checks (viewer < user < admin)
const ROLE_RANK = Object.freeze({
  [ROLES.VIEWER]: 1,
  [ROLES.USER]: 2,
  [ROLES.ADMIN]: 3,
});

/**
 * Normalize role names to a unique, lowercase array.
 * @param {string[]|string|undefined|null} roles - Roles input
 * @returns {string[]} - Normalized roles
 */
function normalizeRoles(roles) {
  if (!roles) return [];
  const arr = Array.isArray(roles) ? roles : [roles];
  return Array.from(
    new Set(arr.map((r) => String(r || "").trim().toLowerCase()).filter(Boolean))
  );
}

/**
 * Get the rank for a given role name; unknown roles have rank 0.
 * @param {string} role - Role name
 * @returns {number} rank
 */
function getRoleRank(role) {
  const key = String(role || "").toLowerCase();
  return ROLE_RANK[key] ?? 0;
}

/**
 * Determine the max rank among a set of user roles.
 * @param {string[]} roles - User role array
 * @returns {number} rank
 */
function getMaxRoleRank(roles) {
  const norm = normalizeRoles(roles);
  return norm.reduce((acc, r) => Math.max(acc, getRoleRank(r)), 0);
}

// PUBLIC_INTERFACE
export function hasRole(userRoles, requiredRole) {
  /** Determine if user has the required role, honoring hierarchy (admin >= user >= viewer).
   *
   * This is used by UI to protect features and actions. For example, admin implicitly
   * satisfies user/viewer checks even if the 'user'/'viewer' strings are not present.
   *
   * GxP Critical: Yes - This guard controls feature availability based on roles.
   *
   * Parameters:
   * - userRoles: string[] | string | null | undefined
   * - requiredRole: string (one of ROLES)
   *
   * Returns:
   * - boolean: true if user meets or exceeds the required role.
   *
   * Throws:
   * - None
   *
   * Audit:
   * - None (pure utility; calling code should log decisions for critical ops)
   */
  const need = String(requiredRole || "").toLowerCase();
  const needRank = getRoleRank(need);
  if (needRank === 0) return false;
  const userRank = getMaxRoleRank(userRoles);
  return userRank >= needRank;
}

// PUBLIC_INTERFACE
export function isAuthorized(requiredRoles, userRoles) {
  /** Check if user is authorized based on one or more required roles.
   *
   * If requiredRoles is a string, this uses hierarchical hasRole().
   * If requiredRoles is an array, user must satisfy at least one of them.
   *
   * GxP Critical: Yes - Helper for UI guards and validations.
   *
   * Parameters:
   * - requiredRoles: string | string[]
   * - userRoles: string | string[]
   *
   * Returns:
   * - boolean
   *
   * Throws:
   * - None
   *
   * Audit:
   * - None (pure utility)
   */
  if (Array.isArray(requiredRoles)) {
    return requiredRoles.some((r) => hasRole(userRoles, r));
  }
  return hasRole(userRoles, requiredRoles);
}

// PUBLIC_INTERFACE
export function canPerform(action, roleRequirements, userRoles = []) {
  /** Determine whether the given action may be performed under the provided role requirements.
   *
   * Usage patterns:
   *   const matrix = { ADMIN_ACTION: ["admin"], default: "viewer" };
   *   canPerform("ADMIN_ACTION", matrix, auth.roles) -> boolean
   *
   * roleRequirements[action] can be:
   *   - undefined -> falls back to roleRequirements.default or allows all (public) if not set
   *   - "public" | "any" -> anyone can perform
   *   - string (e.g., "user") -> hierarchical minimum role required
   *   - string[] (e.g., ["user", "admin"]) -> at least one required
   *   - function (roles, action) => boolean -> custom logic
   *
   * GxP Critical: Yes - Used to enable/disable privileged operations.
   *
   * Parameters:
   * - action: string - Action key
   * - roleRequirements: Record<string, any> - Action requirements map
   * - userRoles: string[] | string
   *
   * Returns:
   * - boolean
   *
   * Throws:
   * - None
   *
   * Audit:
   * - None (pure utility; call sites should log decisions for critical actions)
   */
  if (!action) return false;

  const reqMap = roleRequirements || {};
  let rule = Object.prototype.hasOwnProperty.call(reqMap, action)
    ? reqMap[action]
    : reqMap.default;

  // If no rule configured, allow by default (public).
  if (rule == null) return true;

  if (typeof rule === "function") {
    try {
      return !!rule(normalizeRoles(userRoles), action);
    } catch {
      return false;
    }
  }

  if (typeof rule === "string") {
    const s = rule.trim().toLowerCase();
    if (s === "public" || s === "any") return true;
    return hasRole(userRoles, s);
  }

  if (Array.isArray(rule)) {
    return isAuthorized(rule, userRoles);
  }

  // Unsupported rule type -> deny to be safe
  return false;
}

// PUBLIC_INTERFACE
export function ensureAllowed(action, roleRequirements, userRoles = []) {
  /** Throws an error if canPerform returns false.
   *
   * GxP Critical: Yes - Defensive programming to prevent bypass in business logic.
   *
   * Parameters:
   * - action: string
   * - roleRequirements: Record<string, any>
   * - userRoles: string | string[]
   *
   * Returns:
   * - void
   *
   * Throws:
   * - Error when unauthorized
   */
  if (!canPerform(action, roleRequirements, userRoles)) {
    throw new Error(`Unauthorized: action "${action}" not permitted for current roles.`);
  }
}

// PUBLIC_INTERFACE
export function getUserMaxRole(userRoles) {
  /** Get the user's highest role by hierarchy (for display).
   *
   * GxP Critical: No
   *
   * Parameters:
   * - userRoles: string | string[]
   * Returns:
   * - string | null: One of "admin" | "user" | "viewer" or null when none.
   */
  const rank = getMaxRoleRank(userRoles);
  if (rank >= ROLE_RANK[ROLES.ADMIN]) return ROLES.ADMIN;
  if (rank >= ROLE_RANK[ROLES.USER]) return ROLES.USER;
  if (rank >= ROLE_RANK[ROLES.VIEWER]) return ROLES.VIEWER;
  return null;
}
