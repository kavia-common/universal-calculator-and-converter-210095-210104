/* ============================================================================
   REQUIREMENT TRACEABILITY
   ============================================================================
   Requirement ID: REQ-ESIGN-SERVICE-001
   User Story: As an admin, I want to provide an electronic signature (username,
               password/passphrase, reason/comment) that is verified and bound
               to critical audit actions.
   Acceptance Criteria:
     - verifyCredentials(username, secret) uses AuthService to validate
     - createSignaturePayload(userId, reason, comment) returns:
         { signerId, isoTimestamp, signatureHash, reason, comment }
     - Non-repudiation binding: signatureHash includes signerId, reason,
       comment, and timestamp.
   GxP Impact: YES - Electronic signature and non-repudiation for critical ops.
   Risk Level: MEDIUM
   Validation Protocol: VP-ESIGN-001
   ============================================================================ */
/* ============================================================================
   IMPORTS AND DEPENDENCIES
   ============================================================================ */

import { signIn as authSignIn } from "./AuthService";

/**
 * FNV-1a 32-bit hash for demo purposes. NOT cryptographically secure.
 * Do not use in production systems; prefer server-side signing with secure
 * algorithms and private keys, or WebCrypto with SHA-256.
 * @param {string} input
 * @returns {string} hex string
 */
function fnv1a32(input) {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash +=
      (hash << 1) +
      (hash << 4) +
      (hash << 7) +
      (hash << 8) +
      (hash << 24);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

/**
 * Compute a deterministic "signature hash" based on signer identity,
 * reason/comment, and the timestamp. This binds the signature to the motive
 * and time to support non-repudiation in client-side demo context.
 * In real systems, a server-side signature with private key should be used.
 * @param {string} signerId
 * @param {string} isoTimestamp
 * @param {string} [reason]
 * @param {string} [comment]
 * @returns {string}
 */
function computeSignatureHash(signerId, isoTimestamp, reason = "", comment = "") {
  const data = `${String(signerId)}|${String(reason)}|${String(comment)}|${String(isoTimestamp)}`;
  return fnv1a32(data);
}

// PUBLIC_INTERFACE
export async function verifyCredentials(username, secret) {
  /** Verify user credentials using AuthService without mutating current session.
   *
   * GxP Critical: Yes - Credentials verification is required for e-sign.
   *
   * Parameters:
   * - username: string (non-empty)
   * - secret: string (password/passphrase; non-empty)
   *
   * Returns:
   * - Promise<{id:string, username:string, displayName:string, roles:string[]}>
   *
   * Throws:
   * - Error("Invalid input") when missing fields
   * - Error("Invalid credentials") when verification fails
   *
   * Audit:
   * - Callers must record success/failure in the audit trail with context.
   */
  const u = typeof username === "string" ? username.trim() : "";
  const p = typeof secret === "string" ? secret : "";

  if (!u || !p) throw new Error("Invalid input");

  // AuthService.signIn returns sanitized user; AuthContext persists session, not AuthService.
  // Using it here will NOT change the app session.
  return authSignIn(u, p);
}

// PUBLIC_INTERFACE
export function createSignaturePayload(userId, reason, comment) {
  /** Create an electronic signature payload for binding to audit entries.
   *
   * GxP Critical: Yes - Non-repudiation binding for critical operations.
   *
   * Parameters:
   * - userId: string (required)
   * - reason: string | undefined (required for destructive operations)
   * - comment: string | undefined (additional justification/commentary)
   *
   * Returns:
   * - { signerId:string, isoTimestamp:string, signatureHash:string, reason:string|null, comment:string|null }
   *
   * Throws:
   * - Error if userId is invalid
   *
   * Audit:
   * - Include this object under entry.details.eSign when logging critical actions.
   */
  const signerId = String(userId || "").trim();
  if (!signerId) throw new Error("Invalid signerId");

  const isoTimestamp = new Date().toISOString();
  const hash = computeSignatureHash(signerId, isoTimestamp, reason || "", comment || "");

  return {
    signerId,
    isoTimestamp,
    signatureHash: hash,
    reason: reason ? String(reason) : null,
    comment: comment ? String(comment) : null,
  };
}
