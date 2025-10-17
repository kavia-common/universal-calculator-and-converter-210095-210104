// ============================================================================
// REQUIREMENT TRACEABILITY
// ============================================================================
// Requirement ID: REQ-UI-SCAFFOLD-001
// User Story: As a user, I want an app shell with a two-panel layout (calculator + converter) and a theme toggle.
// Acceptance Criteria:
// - App header with app title and theme toggle
// - TwoPanelLayout used with placeholder content
// - Providers wrapping (config and theme contexts scaffolding)
// - Accessible structure with headings and roles
// GxP Impact: NO - UI scaffolding only; no data changes.
// Risk Level: LOW
// Validation Protocol: N/A
// ============================================================================

import React, { useEffect, useMemo, useState, createContext, useId, useState as useReactState } from "react";
import "./index.css";
import "./App.css";
import { getAppConfig } from "./config/appConfig";
import TwoPanelLayout from "./components/Layout/TwoPanelLayout";
import Button from "./components/Common/Button";
import TextField from "./components/Common/TextField";
import { ValidationService } from "./services/ValidationService";
import { AuthProvider } from "./context/AuthContext.jsx";
import { useAuth } from "./hooks/useAuth";
import { canPerform, ROLES } from "./services/AccessControl";
import { AuditProvider } from "./context/AuditContext.jsx";
import { useAudit } from "./hooks/useAudit";
import EsignModal from "./components/Audit/EsignModal.jsx";

/**
 * PUBLIC_INTERFACE
 * ThemeContext
 * Provides theme name and a toggle function to descendants.
 *
 * @typedef {{theme: "light"|"dark", toggleTheme: () => void}} ThemeContextValue
 */
export const ThemeContext = createContext(
  /** @type {ThemeContextValue} */ ({ theme: "light", toggleTheme: () => {} })
);

/**
 * PUBLIC_INTERFACE
 * ConfigContext
 * Provides read-only application configuration to descendants.
 *
 * @typedef {{APP_VERSION: string, AUDIT_API_URL: (string|null), AUDIT_BATCH_SIZE: number}} AppConfig
 */
export const ConfigContext = createContext(
  /** @type {import("./config/appConfig").AppConfig} */ (getAppConfig())
);

// Simple action-to-role map for demo guarding of placeholder admin actions
const ACTION_MATRIX = Object.freeze({
  ADMIN_ACTION: [ROLES.ADMIN], // Only admins
  default: "viewer", // Everything else is public for demo
});

// Inline component to render sign-in/out area in the header toolbar.
function AuthControls() {
  const auth = useAuth();
  const audit = useAudit();
  const userId = useId();
  const passId = useId();
  const [username, setUsername] = useReactState("");
  const [password, setPassword] = useReactState("");
  const [loading, setLoading] = useReactState(false);
  const [error, setError] = useReactState("");

  if (auth.isAuthenticated) {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span aria-live="polite">
          Signed in as <strong>{auth.currentUser?.displayName}</strong>{" "}
          <span style={{ color: "var(--color-muted)" }}>
            ({auth.roles.join(", ") || "no roles"})
          </span>
        </span>
        <Button
          variant="ghost"
          onClick={() => {
            // Log DELETE of session with reason (destructive action requires reason)
            const uid = auth.currentUser?.id || "unknown";
            try {
              audit.logAction(uid, "DELETE", "session", { method: "toolbar" }, { reason: "User requested sign-out" });
            } catch (e) {
              audit.recordError(e, { userId: uid, entity: "auth-signout" });
            }
            auth.signOut();
          }}
        >
          Sign out
        </Button>
      </div>
    );
  }

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        setError("");
        setLoading(true);
        try {
          await auth.signIn(username, password);
          // Attempt to log sign-in as CREATE session. Use currentUser if present; fallback to entered username.
          const uid = auth.currentUser?.id || String(username || "unknown");
          try {
            audit.logAction(uid, "CREATE", "session", { username: String(username) });
          } catch (e) {
            audit.recordError(e, { userId: uid, entity: "auth-signin" });
          }
          setUsername("");
          setPassword("");
        } catch (err) {
          setError(err instanceof Error ? err.message : "Sign-in failed");
          // Log failed auth attempt as error entry
          try {
            audit.recordError(err, { entity: "auth-failure", extra: { username: String(username) } });
          } catch {
            // ignore
          }
        } finally {
          setLoading(false);
        }
      }}
      style={{ display: "flex", alignItems: "flex-end", gap: 8 }}
      aria-label="Sign in"
    >
      <TextField
        id={userId}
        label="User"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        placeholder="viewer | user | admin"
        style={{ minWidth: 150 }}
      />
      <TextField
        id={passId}
        label="Password"
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="***"
        style={{ minWidth: 130 }}
      />
      <Button type="submit" variant="primary" loading={loading} aria-label="Sign in">
        Sign in
      </Button>
      <div className="sr-only" aria-live="polite">
        {loading ? "Signing in…" : error ? `Error: ${error}` : "Idle"}
      </div>
      {!loading && error && (
        <span role="status" style={{ color: "var(--color-error)", fontSize: "0.9rem" }}>
          {error}
        </span>
      )}
      <span style={{ color: "var(--color-muted)", fontSize: "0.85rem", marginLeft: 4 }}>
        Demo: passwords are admin123 / user123 / viewer123
      </span>
    </form>
  );
}

/**
 * PUBLIC_INTERFACE
 * App root component. Renders the app shell and two-panel layout placeholders.
 *
 * @returns {JSX.Element} The application root
 */
function App() {
  const [theme, setTheme] = useState("light");
  const config = useMemo(() => getAppConfig(), []);

  // Apply theme to <html> via data-theme attribute
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  const themeValue = useMemo(
    () => ({
      theme,
      toggleTheme: () =>
        setTheme((prev) => (prev === "light" ? "dark" : "light")),
    }),
    [theme]
  );

  // Rendered content for the two panels.
  // Admin action buttons below are guarded using AccessControl.canPerform.
  function PanelContent() {
    const auth = useAuth();
    const audit = useAudit();
    const adminAllowed = canPerform("ADMIN_ACTION", ACTION_MATRIX, auth.roles);

    // E-sign modal state and handlers
    const [esignOpen, setEsignOpen] = useState(false);
    const [esignPurpose, setEsignPurpose] = useState(null); // "export" | "clear" | null
    const [busy, setBusy] = useState(false);

    function openEsign(purpose) {
      setEsignPurpose(purpose);
      setEsignOpen(true);
    }

    function closeEsign() {
      setEsignOpen(false);
      setEsignPurpose(null);
    }

    function downloadFile({ content, filename, mimeType }) {
      try {
        const blob = new Blob([content], { type: mimeType || "application/octet-stream" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = filename || "download.txt";
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
      } catch (e) {
        audit.recordError(e, { entity: "audit-export", reason: "Failed to initiate download" });
        window.alert("Download failed. Please try again.");
      }
    }

    async function handleEsignSubmit({ payload, credentials }) {
      // payload: e-sign payload (no secrets)
      // credentials: { username, password, reason? } used only for service call and NEVER logged
      if (!esignPurpose) return;
      setBusy(true);
      const uid = auth.currentUser?.id || "unknown";
      try {
        if (esignPurpose === "export") {
          // Count logs for context
          let total = 0;
          try {
            const resCount = audit.getLogs({ page: 1, pageSize: 1 });
            total = resCount?.total || 0;
          } catch {
            // ignore count error
          }

          // Export JSON by default
          const exported = audit.exportLogs("json");
          downloadFile(exported);

          // Log READ action with e-sign binding
          try {
            audit.logAction(uid, "READ", "audit", {
              operation: "exportLogs",
              exportFile: exported.filename,
              count: total,
              eSign: payload, // non-repudiation binding
            });
          } catch (e) {
            audit.recordError(e, { userId: uid, entity: "audit-export" });
          }
        } else if (esignPurpose === "clear") {
          // Clear logs (destructive) - requires reason and comment in payload
          try {
            const res = audit.clearLogs({
              username: credentials.username,
              password: credentials.password,
              reason: credentials.reason || payload.reason || "Administrative clear",
            });

            // Record the destructive action AFTER clearing so this event persists
            audit.logAction(uid, "DELETE", "audit", {
              operation: "clearLogs",
              cleared: res?.cleared ?? null,
              eSign: payload, // non-repudiation binding
            }, {
              reason: payload?.reason || "Administrative clear with e-signature",
            });
          } catch (e) {
            audit.recordError(e, { userId: uid, entity: "audit-clear", reason: "Failed to clear logs" });
            window.alert("Failed to clear audit logs. Please verify your signature and try again.");
          }
        }
      } catch (err) {
        audit.recordError(err, { userId: uid, entity: "esign-flow", reason: "Unhandled e-sign operation error" });
        window.alert("Operation failed. Please try again.");
      } finally {
        setBusy(false);
        closeEsign();
      }
    }

    const leftPanel = (
      <div>
        <p>
          Placeholder: Basic Calculator will appear here. It will support
          addition, subtraction, multiplication, and division with validation and
          an audit trail in later steps.
        </p>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <Button
            variant="primary"
            onClick={() => {
              // Example validation integration prior to logging/compute
              const validation = ValidationService.validateArithmetic(
                { a: 10, b: 5, op: "div" },
                { aLabel: "Operand A", bLabel: "Operand B" }
              );
              audit.logAction(auth.currentUser?.id || "anonymous", "READ", "calculator", {
                op: "compute",
                inputs: "placeholder",
                validation: { valid: validation.valid, errors: validation.errors || [], sampleResult: validation.result },
              });
            }}
          >
            Compute
          </Button>
          <Button
            variant="ghost"
            disabled={!adminAllowed || busy}
            aria-disabled={!adminAllowed ? "true" : undefined}
            onClick={() => adminAllowed && openEsign("export")}
          >
            Export Audit (Admin)
          </Button>
        </div>
      </div>
    );

    const rightPanel = (
      <div>
        <p>
          Placeholder: Unit/Scale Converter will appear here. It will support
          conversions (e.g., length, mass, temperature) and adhere to validation
          rules in later steps.
        </p>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <Button
            variant="secondary"
            onClick={() => {
              const tcheck = ValidationService.validateTemperatureInput(25, "C", { field: "Temperature" });
              audit.logAction(auth.currentUser?.id || "anonymous", "READ", "converter", {
                op: "convert",
                inputs: "placeholder",
                validation: { valid: tcheck.valid, errors: tcheck.errors || [], unit: tcheck.unit },
              });
            }}
          >
            Convert
          </Button>
          <Button
            variant="ghost"
            disabled={!adminAllowed || busy}
            aria-disabled={!adminAllowed ? "true" : undefined}
            onClick={() => adminAllowed && openEsign("clear")}
          >
            Clear Audit (Admin)
          </Button>
        </div>

        {/* E-Sign modal lives here to access auth/audit contexts */}
        <EsignModal
          open={Boolean(esignOpen)}
          onCancel={() => !busy && closeEsign()}
          onSubmit={handleEsignSubmit}
          title={esignPurpose === "clear" ? "Electronic Signature - Clear Audit" : "Electronic Signature - Export Audit"}
          actionLabel={esignPurpose === "clear" ? "Sign & Clear" : "Sign & Export"}
          requireJustification={esignPurpose === "clear"} // require reason/comment for destructive ops
          defaultUsername={auth.currentUser?.username || ""}
        />
      </div>
    );

    return (
      <TwoPanelLayout
        leftTitle="Calculator"
        rightTitle="Unit Converter"
        leftContent={leftPanel}
        rightContent={rightPanel}
      />
    );
  }

  return (
    <ConfigContext.Provider value={config}>
      <ThemeContext.Provider value={themeValue}>
        <AuditProvider>
          <AuthProvider>
            <div className="app-shell">
              <header className="app-header" role="banner">
                <div className="container app-header__bar">
                  <div className="brand">
                    <h1 className="brand__title">
                      Universal Calculator & Converter
                    </h1>
                    <p className="brand__subtitle">Ocean Professional Theme</p>
                  </div>
                  <div className="toolbar" role="navigation" aria-label="App toolbar">
                    <Button
                      className="theme-toggle"
                      variant="ghost"
                      aria-pressed={theme === "dark" ? "true" : "false"}
                      aria-label={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
                      onClick={themeValue.toggleTheme}
                    >
                      {theme === "light" ? "🌙 Dark Mode" : "☀️ Light Mode"}
                    </Button>
                    <span
                      className="sr-only"
                      aria-live="polite"
                    >{`Theme is ${theme}`}</span>

                    {/* Sign-in / User info controls */}
                    <AuthControls />
                  </div>
                </div>
              </header>

              <main className="app-main" role="main">
                <div className="container">
                  <PanelContent />
                </div>
              </main>

              <footer className="app-footer container" role="contentinfo" style={{ padding: "12px 0 24px", color: "var(--color-muted)", fontSize: "0.9rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
                  <div>Version: {config.APP_VERSION}</div>
                  <div aria-label="Admin actions">Admin: Export and Clear Audit available in panels</div>
                </div>
              </footer>
            </div>
          </AuthProvider>
        </AuditProvider>
      </ThemeContext.Provider>
    </ConfigContext.Provider>
  );
}

export default App;
