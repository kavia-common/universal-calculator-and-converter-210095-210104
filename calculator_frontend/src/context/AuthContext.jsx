// ============================================================================
// REQUIREMENT TRACEABILITY
// ============================================================================
// Requirement ID: REQ-AUTH-CONTEXT-001
// User Story: As an application, I need a centralized authentication context to
//             access the current user, their roles, and to support sign-in/out.
// Acceptance Criteria:
// - Provide currentUser, roles, signIn, signOut, hasRole
// - Persist session to localStorage and restore on refresh
// - Expose a provider for composition in App
// GxP Impact: YES - Authentication and RBAC impact data availability and audit attribution.
// Risk Level: LOW
// Validation Protocol: N/A
// ============================================================================
//
// IMPORTS AND DEPENDENCIES
// ============================================================================

import React, { createContext, useMemo, useCallback } from "react";
import { useLocalStorage } from "../hooks/useLocalStorage";
import { signIn as svcSignIn } from "../services/AuthService";
import { hasRole as acHasRole } from "../services/AccessControl";

export const AUTH_SESSION_KEY = "auth.session.v1";

/**
 * Context value type (JSDoc for consumers)
 * @typedef {Object} AuthContextValue
 * @property {object|null} currentUser - Sanitized user or null
 * @property {string[]} roles - Normalized roles array
 * @property {(username:string, password:string) => Promise<void>} signIn - Sign in
 * @property {() => void} signOut - Sign out (clear session)
 * @property {(requiredRole:string) => boolean} hasRole - Hierarchical role check
 * @property {boolean} isAuthenticated - Convenience flag
 */

const defaultValue = /** @type {AuthContextValue} */ ({
  currentUser: null,
  roles: [],
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  signIn: async (_username, _password) => {},
  signOut: () => {},
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  hasRole: (_role) => false,
  isAuthenticated: false,
});

export const AuthContext = createContext(defaultValue);
AuthContext.displayName = "AuthContext";

// PUBLIC_INTERFACE
export function AuthProvider({ children }) {
  /** Provider for authentication state and actions.
   *
   * GxP Critical: Yes - Controls identity and role checks for features.
   *
   * Parameters:
   * - children: React.ReactNode
   *
   * Returns:
   * - JSX.Element
   *
   * Throws:
   * - None
   *
   * Audit:
   * - On sign-in success/failure, calling UI should generate user-attributed logs
   *   including timestamp and outcome. This provider logs to console for demo.
   */
  const [session, setSession, clearSession] = useLocalStorage(
    AUTH_SESSION_KEY,
    /** @type {{ user: any, loginAt: string } | null} */ (null)
  );

  const currentUser = session?.user ?? null;
  const roles = useMemo(
    () => (currentUser?.roles ? currentUser.roles.map((r) => String(r).toLowerCase()) : []),
    [currentUser]
  );

  const signIn = useCallback(
    async (username, password) => {
      try {
        const user = await svcSignIn(username, password);
        const nowIso = new Date().toISOString();
        setSession({ user, loginAt: nowIso });

        // Minimal demo "audit" log for traceability (replace with real audit in future)
        // eslint-disable-next-line no-console
        console.info("[AUTH] sign-in success", {
          time: nowIso,
          userId: user.id,
          username: user.username,
          roles: user.roles,
        });
      } catch (err) {
        // eslint-disable-next-line no-console
        console.warn("[AUTH] sign-in failure", {
          time: new Date().toISOString(),
          username,
          reason: err instanceof Error ? err.message : "unknown",
        });
        throw err;
      }
    },
    [setSession]
  );

  const signOut = useCallback(() => {
    clearSession();
    // eslint-disable-next-line no-console
    console.info("[AUTH] sign-out", {
      time: new Date().toISOString(),
      userId: currentUser?.id ?? null,
    });
  }, [clearSession, currentUser?.id]);

  const hasRole = useCallback(
    (requiredRole) => acHasRole(roles, requiredRole),
    [roles]
  );

  const value = useMemo(
    () => ({
      currentUser,
      roles,
      signIn,
      signOut,
      hasRole,
      isAuthenticated: !!currentUser,
    }),
    [currentUser, roles, signIn, signOut, hasRole]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
