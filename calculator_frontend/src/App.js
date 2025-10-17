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

import React, { useEffect, useMemo, useState, createContext } from "react";
import "./index.css";
import "./App.css";
import { getAppConfig } from "./config/appConfig";
import TwoPanelLayout from "./components/Layout/TwoPanelLayout";
import Button from "./components/Common/Button";

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

  const leftPanel = (
    <div>
      <p>
        Placeholder: Basic Calculator will appear here. It will support
        addition, subtraction, multiplication, and division with validation and
        an audit trail in later steps.
      </p>
      <div style={{ display: "flex", gap: 8 }}>
        <Button variant="primary">Compute</Button>
        <Button variant="ghost" aria-disabled="true">
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
        <Button variant="ghost" aria-disabled="true">
          Admin action (placeholder)
        </Button>
      </div>
    </div>
  );

  return (
    <ConfigContext.Provider value={config}>
      <ThemeContext.Provider value={themeValue}>
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
              </div>
            </div>
          </header>

          <main className="app-main" role="main">
            <div className="container">
              <TwoPanelLayout
                leftTitle="Calculator"
                rightTitle="Unit Converter"
                leftContent={leftPanel}
                rightContent={rightPanel}
              />
            </div>
          </main>

          <footer className="app-footer container" role="contentinfo" style={{ padding: "12px 0 24px", color: "var(--color-muted)", fontSize: "0.9rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
              <div>Version: {config.APP_VERSION}</div>
              <div aria-label="Admin actions placeholder">Admin: Actions coming soon</div>
            </div>
          </footer>
        </div>
      </ThemeContext.Provider>
    </ConfigContext.Provider>
  );
}

export default App;
