// ============================================================================
// REQUIREMENT TRACEABILITY
// ============================================================================
// Requirement ID: REQ-AUTH-SERVICE-001
// User Story: As a user, I want to sign in using mock credentials so I can access
//             role-restricted features without a backend.
// Acceptance Criteria:
// - Provide signIn(username, password) that validates against a mock DB
// - Store only password hashes in the mock DB (demo hashing acceptable)
// - Expose sanitized user objects (no password/hash leakage)
// - Provide helper to list mock users for documentation/testing
// GxP Impact: YES - Authentication influences access controls.
// Risk Level: LOW
// Validation Protocol: N/A
// ============================================================================
//
// IMPORTS AND DEPENDENCIES
// ============================================================================

import { ROLES } from "./AccessControl";

/**
 * WARNING (Demo Only):
 * This hashing function (FNV-1a 32-bit) is NOT cryptographically secure and
 * is used purely for demonstration. Do NOT use in production.
 * In a real system, rely on a backend with strong password hashing (e.g., bcrypt).
 *
 * @param {string} input
 * @returns {string} hex string
 */
function fnv1a32(input) {
  let hash = 0x811c9dc5; // FNV offset basis
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    // FNV prime multiplication (× 16777619) with 32-bit overflow
    hash +=
      (hash << 1) +
      (hash << 4) +
      (hash << 7) +
      (hash << 8) +
      (hash << 24);
  }
  // Convert to unsigned and hex
  return (hash >>> 0).toString(16).padStart(8, "0");
}

/**
 * Build the mock in-memory user database with hashed passwords.
 * NOTE: Plaintext is present only to construct the hash at startup here.
 * Only the hashed value is retained in the DB records.
 */
function buildMockDb() {
  const seed = [
    {
      id: "u-admin",
      username: "admin",
      displayName: "Administrator",
      roles: [ROLES.ADMIN],
      passwordPlain: "admin123",
    },
    {
      id: "u-user",
      username: "user",
      displayName: "Standard User",
      roles: [ROLES.USER],
      passwordPlain: "user123",
    },
    {
      id: "u-viewer",
      username: "viewer",
      displayName: "Read-Only Viewer",
      roles: [ROLES.VIEWER],
      passwordPlain: "viewer123",
    },
  ];

  return seed.map((u) => ({
    id: u.id,
    username: u.username,
    displayName: u.displayName,
    roles: [...u.roles],
    passwordHash: fnv1a32(u.passwordPlain),
  }));
}

const USERS_DB = buildMockDb();

function sanitizeUser(user) {
  return {
    id: user.id,
    username: user.username,
    displayName: user.displayName,
    roles: Array.isArray(user.roles) ? [...user.roles] : [],
  };
}

/**
 * Find user by username (case-sensitive for demo)
 * @param {string} username
 * @returns {object|undefined}
 */
function findUser(username) {
  return USERS_DB.find((u) => u.username === username);
}

// PUBLIC_INTERFACE
export async function signIn(username, password) {
  /** Sign in a user against the mock DB.
   *
   * GxP Critical: Yes - Controls user identity for subsequent audit trails.
   *
   * Parameters:
   * - username: string (required, non-empty)
   * - password: string (required, non-empty)
   *
   * Returns:
   * - Promise<{id:string, username:string, displayName:string, roles:string[]}>
   *
   * Throws:
   * - Error("Invalid credentials") when username not found or hash mismatch
   * - Error("Invalid input") when username/password invalid
   *
   * Audit:
   * - Calling code should log successful/failed authentication attempts with timestamp and username.
   */
  const u = typeof username === "string" ? username.trim() : "";
  const p = typeof password === "string" ? password : "";

  if (!u || !p) {
    throw new Error("Invalid input");
  }

  const user = findUser(u);
  if (!user) {
    // Deliberately vague message to avoid username enumeration
    throw new Error("Invalid credentials");
  }

  const incomingHash = fnv1a32(p);
  if (incomingHash !== user.passwordHash) {
    throw new Error("Invalid credentials");
  }

  // Simulate async boundary
  await new Promise((res) => setTimeout(res, 50));

  return sanitizeUser(user);
}

// PUBLIC_INTERFACE
export function getMockUsers() {
  /** Return the mock user list (sanitized) for documentation/testing.
   *
   * GxP Critical: No
   *
   * Parameters: None
   * Returns:
   * - Array<{id:string, username:string, displayName:string, roles:string[]}>
   *
   * Throws: None
   * Audit: None
   */
  return USERS_DB.map(sanitizeUser);
}
