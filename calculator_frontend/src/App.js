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
import { AuthProvider } from "./context/AuthContext.jsx";
import { useAuth } from "./hooks/useAuth";
import { canPerform, ROLES } from "./services/AccessControl";

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
        <Button variant="ghost" onClick={auth.signOut}>
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
          setUsername("");
          setPassword("");
        } catch (err) {
          setError(err instanceof Error ? err.message : "Sign-in failed");
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
    const adminAllowed = canPerform("ADMIN_ACTION", ACTION_MATRIX, auth.roles);

    const leftPanel = (
      <div>
        <p>
          Placeholder: Basic Calculator will appear here. It will support
          addition, subtraction, multiplication, and division with validation and
          an audit trail in later steps.
        </p>
        <div style={{ display: "flex", gap: 8 }}>
          <Button variant="primary">Compute</Button>
          <Button variant="ghost" disabled={!adminAllowed} aria-disabled={!adminAllowed ? "true" : undefined}>
            Admin action (placeholder)
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
        <div style={{ display: "flex", gap: 8 }}>
          <Button variant="secondary">Convert</Button>
          <Button variant="ghost" disabled={!adminAllowed} aria-disabled={!adminAllowed ? "true" : undefined}>
            Admin action (placeholder)
          </Button>
        </div>
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
                <div aria-label="Admin actions placeholder">Admin: Actions coming soon</div>
              </div>
            </footer>
          </div>
        </AuthProvider>
      </ThemeContext.Provider>
    </ConfigContext.Provider>
  );
}

export default App;
